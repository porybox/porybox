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
      collection: 'box',
      via: 'owner'
    },
    /* We want a one-to-one mapping between User and UserPreferences objects. Waterline's suppport
    for one-to-one associations is a bit limited, so this is actually stored as a one-to-many
    association that always happens to only contain one UserPreferences object per User. The effect
    of this is that calling User.findOne({}).populate('preferences') will return the user's
    preferences as an Array. This Array will only contain one object, which is the user's
    preferences.
    */
    preferences: {
      collection: 'UserPreferences',
      via: 'user'
    }
  }
};
