const TeamGroup = require("../models/TeamGroup");
const notificationService = require("./notificationService");
const User = require("../models/User");

exports.getAll = async () => {
  return TeamGroup.find().sort({ createdAt: -1 });
};

exports.getById = async (id) => {
  const team = await TeamGroup.findById(id);
  if (!team) throw Object.assign(new Error("Tim tidak ditemukan"), { statusCode: 404 });
  return team;
};

exports.create = async (data, requestUser) => {
  const team = await TeamGroup.create(data);

  // Notify all members (excluding creator)
  try {
    const creatorId = requestUser?.id || requestUser?._id?.toString();
    const membersToNotify = [
      ...(team.memberIds || []),
      team.leaderId,
    ].filter(id => id && id !== creatorId);
    const uniqueIds = [...new Set(membersToNotify)];

    if (uniqueIds.length > 0) {
      await notificationService.createForUsers(uniqueIds, {
        title: "Anda Ditambahkan ke Tim",
        message: `Anda telah ditambahkan ke tim "${team.name}"`,
        type: "info",
        category: "team",
        sender: requestUser?.name || "Admin",
        title: team.name,
      });
    }
  } catch (err) {
    console.error("[Team] Failed to notify on create:", err);
  }

  return team;
};

exports.update = async (id, data, requestUser) => {
  const prevTeam = await TeamGroup.findById(id);
  if (!prevTeam) throw Object.assign(new Error("Tim tidak ditemukan"), { statusCode: 404 });

  const prevMemberIds = new Set([
    ...(prevTeam.memberIds || []),
    prevTeam.leaderId,
  ].filter(Boolean));

  const team = await TeamGroup.findByIdAndUpdate(id, data, { new: true });
  if (!team) throw Object.assign(new Error("Tim tidak ditemukan"), { statusCode: 404 });

  // Notify newly added members
  try {
    const updaterId = requestUser?.id || requestUser?._id?.toString();
    const newMemberIds = [
      ...(team.memberIds || []),
      team.leaderId,
    ].filter(id => id && !prevMemberIds.has(id) && id !== updaterId);
    const uniqueNewIds = [...new Set(newMemberIds)];

    if (uniqueNewIds.length > 0) {
      await notificationService.createForUsers(uniqueNewIds, {
        title: "Anda Ditambahkan ke Tim",
        message: `Anda telah ditambahkan ke tim "${team.name}"`,
        type: "info",
        category: "team",
        sender: requestUser?.name || "Admin",
        title: team.name,
      });
    }
  } catch (err) {
    console.error("[Team] Failed to notify on update:", err);
  }

  return team;
};

exports.remove = async (id) => {
  const team = await TeamGroup.findByIdAndDelete(id);
  if (!team) throw Object.assign(new Error("Tim tidak ditemukan"), { statusCode: 404 });
  return { message: "Tim berhasil dihapus" };
};
