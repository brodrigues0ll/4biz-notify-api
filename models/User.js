import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fourBizSessionCookie: { type: String, default: '' },
  fourBizAuthToken: { type: String, default: '' },
  fourBizSessionExpiry: { type: Date, default: null },
  phoneToken: {
    endpoint: String,
    keys: { p256dh: String, auth: String },
  },
  expoPushToken: { type: String, default: '' },
  autoSyncEnabled: { type: Boolean, default: false },
  autoSyncIntervalMinutes: { type: Number, default: 5, min: 1 },
  lastAutoSync: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
