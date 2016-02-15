module.exports =  {
  // Enforce model schema in the case of schemaless databases
  schema: true,

  attributes: {
    name: {
      type: 'string'
    },
    user: {
      model: 'User',
      required: true
    },
    description: {
      type: 'string'
    }
  }
};
