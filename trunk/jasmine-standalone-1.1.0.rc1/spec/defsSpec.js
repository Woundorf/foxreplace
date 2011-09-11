describe("Substitution", function() {

  describe("default parameters (case-insensitive, text substitution)", function() {

    var substitution;

    beforeEach(function() {
      substitution = new FxRSubstitution("a", "@");
    });

    it("should return a replaced string", function() {
      var result = substitution.replace("asdf ASDF");
      expect(result).toEqual("@sdf @SDF");
    });

    it("should return the same string", function() {
      var result = substitution.replace("qwerty");
      expect(result).toEqual("qwerty");
    });

    it("should return undefined", function() {
      var result = substitution.replace();
      expect(result).toBe(undefined);
    });

    it("should return undefined too", function() {
      var result = substitution.replace(undefined);
      expect(result).toBe(undefined);
    });

    it("should return null", function() {
      var result = substitution.replace(null);
      expect(result).toBe(null);
    });

  });

  describe("case-sensitive", function() {

    it("should return a replaced string (lower case)", function() {
      var substitution = new FxRSubstitution("a", "@", true);
      var result = substitution.replace("asdf ASDF");
      expect(result).toEqual("@sdf ASDF");
    });

    it("should return a replaced string (upper case)", function() {
      var substitution = new FxRSubstitution("A", "@", true);
      var result = substitution.replace("asdf ASDF");
      expect(result).toEqual("asdf @SDF");
    });

  });

});
