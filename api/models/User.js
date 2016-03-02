module.exports =  {
  // Enforce model schema in the case of schemaless databases
  schema: true,

  attributes: {
    name: {
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
    },
    boxes: {
      collection: 'Box',
      via: 'user'
    }
  }
};
