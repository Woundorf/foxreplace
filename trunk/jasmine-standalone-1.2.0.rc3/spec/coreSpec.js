describe("Substitution", function() {

  describe("default parameters (case-insensitive, text substitution)", function() {

    var substitution;

    beforeEach(function() {
      substitution = new Substitution("a", "@");
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
      var substitution = new Substitution("a", "@", true);
      var result = substitution.replace("asdf ASDF");
      expect(result).toEqual("@sdf ASDF");
    });

    it("should return a replaced string (upper case)", function() {
      var substitution = new Substitution("A", "@", true);
      var result = substitution.replace("asdf ASDF");
      expect(result).toEqual("asdf @SDF");
    });

  });

});

describe("SubstitutionGroup", function() {

  describe("matches()", function() {

    it("should work with no URLs", function() {
      var group = new SubstitutionGroup();
      expect(group.matches("http://www.example.com/")).toBe(true);
    });

    it("should work with one URL", function() {
      var urls = ["www.example.com"];
      var group = new SubstitutionGroup(urls);
      expect(group.matches("www.example.com")).toBe(true);
      expect(group.matches("http://www.example.com/")).toBe(true);
      expect(group.matches("http://www.example.com/foo")).toBe(true);
      expect(group.matches("http://example.com/")).toBe(false);
    });

    it("should work with more than one URL", function() {
      var urls = ["example.com", "foo.net"];
      var group = new SubstitutionGroup(urls);
      expect(group.matches("http://www.example.com/")).toBe(true);
      expect(group.matches("http://foo.net/")).toBe(true);
      expect(group.matches("http://bar.org/")).toBe(false);
    });

    it("should work with wildcards", function() {
      var urls = ["http://*.example.com", "http*://foo.*/fu*.html", "http://**.bar.org"];
      var group = new SubstitutionGroup(urls);
      expect(group.matches("http://www.example.com/")).toBe(true);
      expect(group.matches("http://ex.example.com/")).toBe(true);
      expect(group.matches("http://example.com/")).toBe(false);
      expect(group.matches("http://foo.net/fu.html")).toBe(true);
      expect(group.matches("https://foo.net/fu.html")).toBe(true);
      expect(group.matches("http://foo.info/fuuu.html")).toBe(true);
      expect(group.matches("ftp://foo.net/fun.html")).toBe(false);
      expect(group.matches("http://foo.bar.org/")).toBe(true);
      expect(group.matches("http://bar.org/")).toBe(false);
    });

    it("should work with special characters", function() {
      var urls = ["el-guió.cat/falç?v=%4Fg+42&x=_26"];
      var group = new SubstitutionGroup(urls);
      expect(group.matches("http://www.el-guió.cat/falç?v=%4Fg+42&x=_26")).toBe(true);
    });

    it("should work with anchors", function() {
      var urls = ["|ftp://www.example1.com/", "ftp://www.example2.com/|", "|ftp://www.example3.com/|"];
      var group = new SubstitutionGroup(urls);
      expect(group.matches("ftp://www.example1.com/")).toBe(true);
      expect(group.matches("ftp://www.example1.com/foo")).toBe(true);
      expect(group.matches("sftp://www.example1.com/")).toBe(false);
      expect(group.matches("ftp://www.example2.com/")).toBe(true);
      expect(group.matches("sftp://www.example2.com/")).toBe(true);
      expect(group.matches("ftp://www.example2.com/foo")).toBe(false);
      expect(group.matches("ftp://www.example3.com/")).toBe(true);
      expect(group.matches("sftp://www.example3.com/")).toBe(false);
      expect(group.matches("ftp://www.example3.com/foo")).toBe(false);
      expect(group.matches("sftp://www.example3.com/foo")).toBe(false);
    });

    it("should work with exclusion URLs", function() {
      var urls = ["example.com", "-example.com/bar"];
      var group = new SubstitutionGroup(urls);
      expect(group.matches("http://www.example.com/")).toBe(true);
      expect(group.matches("http://www.example.com/foo")).toBe(true);
      expect(group.matches("http://www.example.com/bar")).toBe(false);
      expect(group.matches("http://foo.net/")).toBe(false);
    });

    it("should work with URLs starting with hyphens", function() {
      var urls = ["|*-example.com"];
      var group = new SubstitutionGroup(urls);
      expect(group.matches("http://-example.com/")).toBe(true);
      expect(group.matches("http://some-example.com/")).toBe(true);
    });

  });

});
