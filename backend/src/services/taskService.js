const Task = require("../models/Task");
const Activity = require("../models/Activity");
const Notification = require("../models/Notification");
const TeamGroup = require("../models/TeamGroup");
const User = require("../models/User");

const getUsersByIds = async (userIds = []) => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return [];
  return User.find({ _id: { $in: uniqueIds } });
};

const getUsersWithPreference = async (userIds = [], preferenceKey) => {
  const users = await getUsersByIds(userIds);
  return users.filter((user) => user.notificationSettings?.[preferenceKey] !== false);
};

exports.getAll = async (query = {}, requestUser = null) => {
  const filter = {};
  if (query.assigneeId) filter.assigneeId = query.assigneeId;
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.type) filter.type = query.type;
  if (query.teamId) filter.teamId = query.teamId;

  if (requestUser && requestUser.role !== "admin") {
    const userId = requestUser.id;
    const teams = await TeamGroup.find({ $or: [{ memberIds: userId }, { leaderId: userId }] });
    const teamIds = teams.map((team) => team._id.toString());

    const accessConditions = [
      { type: "personal", assigneeId: userId },
      { "reviewers.userId": userId },
    ];
    if (teamIds.length > 0) {
      accessConditions.push({ type: "team", teamId: { $in: teamIds } });
    }

    const andConditions = [{ $or: accessConditions }];
    if (Object.keys(filter).length > 0) {
      andConditions.push(filter);
    }

    return Task.find({ $and: andConditions }).sort({ createdAt: -1 });
  }

  return Task.find(filter).sort({ createdAt: -1 });
};

exports.getById = async (id) => {
  const task = await Task.findById(id);
  if (!task) throw Object.assign(new Error("Task tidak ditemukan"), { statusCode: 404 });
  return task;
};

exports.create = async (data, requestUser) => {
  const role = requestUser?.role;
  const userId = requestUser?.id;

  if (role !== "admin") {
    const leaderTeams = await TeamGroup.find({ leaderId: userId });
    if (leaderTeams.length === 0) {
      throw Object.assign(new Error("Hanya admin dan ketua tim yang bisa membuat tugas"), { statusCode: 403 });
    }
    if (data.type !== "team") {
      throw Object.assign(new Error("Ketua tim hanya bisa membuat tugas tim"), { statusCode: 403 });
    }
    const leaderTeamIds = leaderTeams.map((t) => t._id.toString());
    if (!data.teamId || !leaderTeamIds.includes(data.teamId)) {
      throw Object.assign(new Error("Anda hanya bisa membuat tugas untuk tim yang Anda pimpin"), { statusCode: 403 });
    }
  }

  if (data.type === "personal" && !data.assigneeId) {
    throw Object.assign(new Error("Tugas pribadi harus memiliki assigneeId"), { statusCode: 400 });
  }
  if (data.type === "team" && !data.teamId) {
    throw Object.assign(new Error("Tugas tim harus memiliki teamId"), { statusCode: 400 });
  }
  if (data.type === "team" && data.teamId) {
    const team = await TeamGroup.findById(data.teamId);
    if (!team) {
      throw Object.assign(new Error("Tim tidak ditemukan"), { statusCode: 404 });
    }
  }

  const task = await Task.create(data);
  const creatorName = requestUser?.name || "Seseorang";

  await Activity.create({
    type: "task_created",
    message: `${creatorName} membuat tugas '${task.title}'`,
    userId: data.assigneeId || data.createdBy,
  });

  if (task.type === "team" && task.teamId) {
    const team = await TeamGroup.findById(task.teamId);
    if (team) {
      const recipientIds = [...new Set([...(team.memberIds || []), team.leaderId].filter((id) => id && id !== data.createdBy))];
      const recipients = await getUsersWithPreference(recipientIds, "teamUpdates");
      await Promise.all(recipients.map((recipient) => Notification.create({
        userId: recipient._id.toString(),
        title: "Tugas Tim Baru",
        message: `Tugas tim baru: ${task.title}`,
        type: "info",
      })));
    }
  } else if (data.assigneeId) {
    const recipients = await getUsersWithPreference([data.assigneeId], "taskAssignments");
    await Promise.all(recipients.map((recipient) => Notification.create({
      userId: recipient._id.toString(),
      title: "Tugas Baru",
      message: `Anda mendapat tugas baru: ${task.title}`,
      type: "info",
    })));
  }

  return task;
};

exports.update = async (id, data) => {
  const task = await Task.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!task) throw Object.assign(new Error("Task tidak ditemukan"), { statusCode: 404 });
  return task;
};

exports.updateStatus = async (id, status, requestUser, reviewerIds) => {
  const task = await Task.findById(id);
  if (!task) throw Object.assign(new Error("Task tidak ditemukan"), { statusCode: 404 });

  if (task.status === "completed") {
    throw Object.assign(new Error("Tugas yang sudah selesai tidak dapat diubah statusnya"), { statusCode: 400 });
  }

  const isAdminUser = requestUser?.role === "admin";

  // For team tasks: only leader or admin can change status
  if (task.type === "team" && task.teamId) {
    const team = await TeamGroup.findById(task.teamId);
    const isLeader = team && team.leaderId === requestUser?.id;
    const isReviewer = task.reviewers?.some(r => r.userId === requestUser?.id);

    if (status === "completed") {
      if (!isReviewer && !isAdminUser) {
        throw Object.assign(new Error("Hanya peninjau atau admin yang bisa menyelesaikan tugas ini"), { statusCode: 403 });
      }
    } else if (!isLeader && !isAdminUser) {
      throw Object.assign(new Error("Hanya ketua tim atau admin yang bisa mengubah status tugas tim"), { statusCode: 403 });
    }
  } else {
    // Personal tasks: only reviewer can mark completed if reviewer is assigned
    if (status === "completed" && task.reviewers?.length > 0) {
      const isReviewer = task.reviewers.some(r => r.userId === requestUser?.id);
      if (!isReviewer && !isAdminUser) {
        throw Object.assign(new Error("Hanya peninjau atau admin yang bisa menyelesaikan tugas ini"), { statusCode: 403 });
      }
    }
  }

  // If moving to needs-review, set reviewers array
  if (status === "needs-review" && reviewerIds && reviewerIds.length > 0) {
    task.reviewers = reviewerIds.map(uid => ({
      userId: uid,
      status: "pending",
      reason: "",
      reviewedAt: "",
    }));
  }

  task.status = status;
  
  // If moving back to in-progress, reset all reviewer statuses
  if (status === "in-progress" && task.reviewers?.length > 0) {
    task.reviewers.forEach(r => {
      r.status = "pending";
      r.reason = "";
      r.reviewedAt = "";
    });
  }

  await task.save();

  const actorName = requestUser?.name || "Seseorang";
  const activityType = status === "completed" ? "task_completed" : "status_changed";
  const activityMessage = status === "completed"
    ? `${actorName} menyelesaikan '${task.title}'`
    : `${actorName} memindahkan '${task.title}' ke ${status}`;

  await Activity.create({
    type: activityType,
    message: activityMessage,
    userId: task.assigneeId || task.createdBy,
  });

  // Notifications
  if (status === "needs-review" && task.reviewers?.length > 0) {
    // Notify all reviewers
    const reviewerUserIds = task.reviewers.map(r => r.userId);
    await Promise.all(reviewerUserIds.map((rid) => Notification.create({
      userId: rid,
      title: "Permintaan Tinjauan Tugas",
      message: `${actorName} meminta Anda meninjau tugas '${task.title}'`,
      type: "info",
    })));
  } else if (status === "completed") {
    const reviewerUser = requestUser?.name || "Peninjau";
    const recipientIds = [...new Set([task.createdBy, task.assigneeId].filter((rid) => rid && rid !== requestUser?.id))];
    await Promise.all(recipientIds.map((rid) => Notification.create({
      userId: rid,
      title: "Tugas Disetujui",
      message: `Tugas '${task.title}' telah diselesaikan oleh ${reviewerUser}`,
      type: "success",
    })));

    if (task.type === "team" && task.teamId) {
      const team = await TeamGroup.findById(task.teamId);
      if (team) {
        const teamRecipientIds = [...new Set([...(team.memberIds || []), team.leaderId]
          .filter((rid) => rid && rid !== requestUser?.id && !recipientIds.includes(rid)))];
        const recipients = await getUsersWithPreference(teamRecipientIds, "teamUpdates");
        await Promise.all(recipients.map((recipient) => Notification.create({
          userId: recipient._id.toString(),
          title: "Tugas Tim Selesai",
          message: `Tugas tim '${task.title}' telah diselesaikan`,
          type: "success",
        })));
      }
    }
  } else if (task.type === "team" && task.teamId) {
    const team = await TeamGroup.findById(task.teamId);
    const recipientIds = [...new Set([task.createdBy, team?.leaderId].filter((rid) => rid && rid !== requestUser?.id))];
    const recipients = await getUsersWithPreference(recipientIds, "teamUpdates");
    await Promise.all(recipients.map((recipient) => Notification.create({
      userId: recipient._id.toString(),
      title: "Pembaruan Tugas Tim",
      message: `Status tugas tim '${task.title}' berubah menjadi ${status}`,
      type: "info",
    })));
  }

  return task;
};

exports.reviewTask = async (id, action, reason, requestUser) => {
  const task = await Task.findById(id);
  if (!task) throw Object.assign(new Error("Task tidak ditemukan"), { statusCode: 404 });

  if (task.status !== "needs-review") {
    throw Object.assign(new Error("Tugas ini tidak dalam status perlu ditinjau"), { statusCode: 400 });
  }

  const reviewerEntry = task.reviewers?.find(r => r.userId === requestUser?.id);
  if (!reviewerEntry) {
    throw Object.assign(new Error("Anda bukan peninjau tugas ini"), { statusCode: 403 });
  }

  if (reviewerEntry.status !== "pending") {
    throw Object.assign(new Error("Anda sudah memberikan tinjauan"), { statusCode: 400 });
  }

  reviewerEntry.status = action; // "approved" or "rejected"
  reviewerEntry.reason = reason || "";
  reviewerEntry.reviewedAt = new Date().toISOString();

  const actorName = requestUser?.name || "Peninjau";

  if (action === "rejected") {
    // Any rejection → task back to in-progress
    task.status = "in-progress";
    // Reset all other pending reviewers
    task.reviewers.forEach(r => {
      if (r.userId !== requestUser.id && r.status === "pending") {
        r.status = "pending"; // keep pending but task moves back
      }
    });
    await task.save();

    // Notify assignee/creator
    const recipientIds = [...new Set([task.assigneeId, task.createdBy].filter(rid => rid && rid !== requestUser.id))];
    await Promise.all(recipientIds.map(rid => Notification.create({
      userId: rid,
      title: "Tugas Ditolak",
      message: `${actorName} menolak tugas '${task.title}'${reason ? `: ${reason}` : ""}`,
      type: "warning",
    })));

    await Activity.create({
      type: "status_changed",
      message: `${actorName} menolak tinjauan '${task.title}'${reason ? `: ${reason}` : ""}`,
      userId: task.assigneeId || task.createdBy,
    });
  } else if (action === "approved") {
    // Check if ALL reviewers approved
    const allApproved = task.reviewers.every(r => r.status === "approved");
    if (allApproved) {
      task.status = "completed";
      await Activity.create({
        type: "task_completed",
        message: `Semua peninjau menyetujui '${task.title}'`,
        userId: task.assigneeId || task.createdBy,
      });

      // Notify assignee/creator
      const recipientIds = [...new Set([task.assigneeId, task.createdBy].filter(rid => rid && rid !== requestUser.id))];
      await Promise.all(recipientIds.map(rid => Notification.create({
        userId: rid,
        title: "Tugas Disetujui",
        message: `Semua peninjau telah menyetujui tugas '${task.title}'`,
        type: "success",
      })));
    } else {
      // Notify assignee about partial approval
      if (task.assigneeId && task.assigneeId !== requestUser.id) {
        await Notification.create({
          userId: task.assigneeId,
          title: "Tinjauan Parsial",
          message: `${actorName} menyetujui tugas '${task.title}'. Menunggu peninjau lainnya.`,
          type: "info",
        });
      }
    }
    await task.save();
  }

  return task;
};

exports.uploadAttachments = async (id, attachments = []) => {
  const task = await Task.findById(id);
  if (!task) throw Object.assign(new Error("Task tidak ditemukan"), { statusCode: 404 });

  task.attachments = [...(task.attachments || []), ...attachments];
  await task.save();
  return task;
};

exports.addNote = async (id, note) => {
  const task = await Task.findById(id);
  if (!task) throw Object.assign(new Error("Task tidak ditemukan"), { statusCode: 404 });
  task.notes.push(note);
  await task.save();

  await Activity.create({
    type: "note_added",
    message: `Catatan ditambahkan di '${task.title}'`,
    userId: note.authorId,
  });

  return task;
};

exports.remove = async (id) => {
  const task = await Task.findByIdAndDelete(id);
  if (!task) throw Object.assign(new Error("Task tidak ditemukan"), { statusCode: 404 });
  return { message: "Task berhasil dihapus" };
};
