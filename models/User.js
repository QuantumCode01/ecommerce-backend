import { DataTypes } from "sequelize";
import { sequelize } from "./index.js";

export const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false
    },

    refreshToken: {
      type: DataTypes.TEXT
    },

    // 🔐 FORGOT PASSWORD SUPPORT
    resetToken: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    resetTokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    timestamps: true
  }
);
