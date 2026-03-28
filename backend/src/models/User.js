const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "employee"], default: "admin" },
  avatar: { type: String, default: "" },
  joinDate: { type: String, default: () => new Date().toISOString().split("T")[0] },
  department: { type: String, default: "" },
  position: { type: String, default: "" },
  phone: { type: String, default: "" },
  emergencyContact: { type: String, default: "" },
  address: { type: String, default: "" },
  contractType: { type: String, default: "" },
  pin: { type: String, default: "" },
  notificationSettings: {
    taskAssignments: { type: Boolean, default: true },
    deadlineReminders: { type: Boolean, default: true },
    teamUpdates: { type: Boolean, default: false },
  },
  // Extended profile
  birthPlace: { type: String, default: "" },
  birthDate: { type: String, default: "" },
  gender: { type: String, enum: ["male", "female", ""], default: "" },
  religion: { type: String, default: "" },
  maritalStatus: { type: String, enum: ["single", "married", "divorced", "widowed", ""], default: "" },
  npwp: { type: String, default: "" },
  bpjsKesehatan: { type: String, default: "" },
  bpjsKetenagakerjaan: { type: String, default: "" },
  bankName: { type: String, default: "" },
  bankAccountNumber: { type: String, default: "" },
  bankAccountName: { type: String, default: "" },
}, { timestamps: true });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
