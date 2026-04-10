const FOOTER = "\n\n_Kunjungi Apply.telnet.co.id_";

function buildMessage(category, data = {}) {
  const name = data.name || "kamu";
  const title = data.title || "";
  const status = data.status || "";
  const month = data.month || "";
  const sender = data.sender || "admin";

  const templates = {
    task: `Hai ${name}, ada tugas baru yang perlu kamu kerjakan: "${title}". Segera dicek ya.${FOOTER}`,

    announcement: `Hai ${name}, ada pengumuman baru: "${title}". Pastikan kamu sudah membacanya.${FOOTER}`,

    approval: `Hai ${name}, ada pengajuan baru yang perlu ditindaklanjuti: "${title}". Silakan cek detailnya.${FOOTER}`,

    attendance: `Hai ${name}, kehadiran kamu hari ini sudah tercatat dengan status ${status}. Terima kasih sudah tepat waktu.${FOOTER}`,

    message: `Hai ${name}, kamu mendapat pesan baru dari ${sender}. Silakan cek dan balas di website.${FOOTER}`,

    payslip: `Hai ${name}, slip gaji kamu untuk periode ${month} sudah tersedia. Silakan cek detailnya di website.${FOOTER}`,

    finance: `Hai ${name}, ada pembaruan terkait pengajuan keuangan kamu: "${title}". Silakan cek statusnya.${FOOTER}`,

    explorer: `Hai ${name}, ada file baru yang dibagikan untuk kamu: "${title}". Silakan cek di Explorer.${FOOTER}`,

    partner: `Hai ${name}, ada pembaruan terkait mitra: "${title}". Silakan cek detailnya.${FOOTER}`,

    team: `Hai ${name}, ada pembaruan di tim kamu: "${title}". Segera dicek ya.${FOOTER}`,

    work_report: `Hai ${name}, ada laporan kerja baru: "${title}". Silakan cek dan tinjau.${FOOTER}`,

    general: `Hai ${name}, ada notifikasi baru untuk kamu: "${title}". Silakan cek di website.${FOOTER}`,
  };

  return templates[category] || templates.general;
}

function buildSubject(category, data = {}) {
  const title = data.title || "Notifikasi Baru";

  const subjects = {
    task: `Tugas Baru: ${title}`,
    announcement: `Pengumuman: ${title}`,
    approval: `Pengajuan: ${title}`,
    attendance: `Kehadiran Tercatat`,
    message: `Pesan Baru dari ${data.sender || "Tim"}`,
    payslip: `Slip Gaji Tersedia`,
    finance: `Update Keuangan: ${title}`,
    explorer: `File Baru: ${title}`,
    partner: `Update Mitra: ${title}`,
    team: `Update Tim: ${title}`,
    work_report: `Laporan Kerja: ${title}`,
    general: title,
  };

  return subjects[category] || subjects.general;
}

module.exports = { buildMessage, buildSubject };
