module.exports = {
  schema: true,
  autoCreatedAt: false,
  attributes: {
    timestamp: {type: 'integer'},
    id: {type: 'hexadecimal', unique: true, primaryKey: true},
    owner: {type: 'string', unique: true, required: true},
    isExpired () {
      return Date.now() > this.timestamp + Constants.PASSWORD_RESET_EXPIRATION_TIME;
    }
  },
  beforeCreate (record, next) {
    PasswordReset.destroy({owner: record.owner}).then(() => {
      record.id = Util.generateHexId(32);
      record.timestamp = Date.now();
      return record;
    }).asCallback(next);
  }
};
