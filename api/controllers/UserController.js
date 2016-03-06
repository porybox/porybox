module.exports = {
  async boxes (req, res) {
    try {
      const user = await User.findOne({id: req.param('name')}).populate('boxes');
      if (!user) {
        return res.notFound();
      }
      const boxes = user.boxes;
      if (req.user.name === user.name) {
        return res.ok(boxes);
      }
      return res.ok(
        _.reject(boxes, b => b.visibility === 'unlisted').map(b => b.omitPrivateContents())
      );
    } catch (err) {
      return res.serverError(err);
    }
  }
};
