module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    // ... existing fields
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });
  
  return User;
}; 