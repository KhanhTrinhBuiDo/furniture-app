import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, select: false },
        phone: { type: String, default: "" },
        dob: { type: Date, default: null },
        avatar: { type: String, default: "" },
        role: { type: String, enum: ["user", "admin", "staff"], default: "user" },
        isActive: { type: Boolean, default: true },
        authProvider: { type: String, enum: ["local", "google"], default: "local" },
        googleId: { type: String, sparse: true, default: null },
        resetOTP: { type: String, select: false, default: null },
        resetOTPExpires: { type: Date, select: false, default: null },
        resetOTPVerified: { type: Boolean, select: false, default: false },
    },
    { timestamps: true }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password") || !this.password) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.comparePassword = async function (plain) {
    return bcrypt.compare(plain, this.password);
};

userSchema.methods.toPublicJSON = function () {
    return {
        id: this._id, fullName: this.fullName, email: this.email,
        phone: this.phone, dob: this.dob, avatar: this.avatar,
        role: this.role, authProvider: this.authProvider, createdAt: this.createdAt,
    };
};

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;