module.exports =  {
  // Enforce model schema in the case of schemaless databases
  schema: true,

  attributes: {
    username: {
      type: 'string',
      columnName: 'id',
      unique: true,
      primaryKey: true
    },
    email: {
      type: 'email',
      unique: true
    },
    passports: {
      collection: 'Passport',
      via: 'user'
    }
  }
};
