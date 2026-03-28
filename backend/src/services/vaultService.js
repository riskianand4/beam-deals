const CompanyLink = require("../models/CompanyLink");
const Credential = require("../models/Credential");

// Company links
exports.getCompanyLinks = async () => {
  return CompanyLink.find().sort({ category: 1 });
};

exports.createCompanyLink = async (data) => {
  return CompanyLink.create(data);
};

exports.updateCompanyLink = async (id, data) => {
  const link = await CompanyLink.findByIdAndUpdate(id, data, { new: true });
  if (!link) throw Object.assign(new Error("Link tidak ditemukan"), { statusCode: 404 });
  return link;
};

exports.deleteCompanyLink = async (id) => {
  const link = await CompanyLink.findByIdAndDelete(id);
  if (!link) throw Object.assign(new Error("Link tidak ditemukan"), { statusCode: 404 });
  return { message: "Link berhasil dihapus" };
};

// Personal credentials
exports.getCredentials = async (userId) => {
  return Credential.find({ userId });
};

exports.createCredential = async (data) => {
  return Credential.create(data);
};

exports.updateCredential = async (id, data) => {
  const cred = await Credential.findByIdAndUpdate(id, data, { new: true });
  if (!cred) throw Object.assign(new Error("Kredensial tidak ditemukan"), { statusCode: 404 });
  return cred;
};

exports.deleteCredential = async (id) => {
  const cred = await Credential.findByIdAndDelete(id);
  if (!cred) throw Object.assign(new Error("Kredensial tidak ditemukan"), { statusCode: 404 });
  return { message: "Kredensial berhasil dihapus" };
};
