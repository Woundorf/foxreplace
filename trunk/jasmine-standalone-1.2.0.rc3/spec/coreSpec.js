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

  describe("whole words", function() {

    describe("word characters", function() {

      var words;

      beforeEach(function() {
        words = [];
        words[0] = new Substitution("foo", "bar", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[1] = new Substitution("étimos", "ètims", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[2] = new Substitution("exalçar", "exaltar", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[3] = new Substitution("cavalcarà", "correrà", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[4] = new Substitution("आपका", "Hindi", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[5] = new Substitution("מאראסט", "Jiddisch", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[6] = new Substitution("Каталония", "Cyrillic", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[7] = new Substitution("小亚细亚", "Chinese", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[8] = new Substitution("1234", "asdf", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[9] = new Substitution("foo123", "bar456", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[10] = new Substitution("_underscore_", "^_^", true, Substitution.prototype.INPUT_WHOLE_WORDS);
      });

      it("should replace single words", function() {
        expect(words[0].replace("foo")).toEqual("bar");
        expect(words[1].replace("étimos")).toEqual("ètims");
        expect(words[2].replace("exalçar")).toEqual("exaltar");
        expect(words[3].replace("cavalcarà")).toEqual("correrà");
        expect(words[4].replace("आपका")).toEqual("Hindi");
        expect(words[5].replace("מאראסט")).toEqual("Jiddisch");
        expect(words[6].replace("Каталония")).toEqual("Cyrillic");
        expect(words[7].replace("小亚细亚")).toEqual("Chinese");
        expect(words[8].replace("1234")).toEqual("asdf");
        expect(words[9].replace("foo123")).toEqual("bar456");
        expect(words[10].replace("_underscore_")).toEqual("^_^");
      });

      it("should not replace non-whole words", function() {
        expect(words[0].replace("food")).toEqual("food");
        expect(words[1].replace("hétimos")).toEqual("hétimos");
        expect(words[2].replace("exalçaren")).toEqual("exalçaren");
        expect(words[3].replace("descavalcarà")).toEqual("descavalcarà");
        expect(words[4].replace("आपका_h")).toEqual("आपका_h");
        expect(words[5].replace("מאראסט_j")).toEqual("מאראסט_j");
        expect(words[6].replace("Каталония_cy")).toEqual("Каталония_cy");
        expect(words[7].replace("小亚细亚_ch")).toEqual("小亚细亚_ch");
        expect(words[8].replace("123456")).toEqual("123456");
        expect(words[9].replace("foo1234")).toEqual("foo1234");
        expect(words[10].replace("_underscore_u_u")).toEqual("_underscore_u_u");
      });

      it("should replace words between spaces", function() {
        expect(words[0].replace("\tfoo\n")).toEqual("\tbar\n");
        expect(words[1].replace("\vétimos\f")).toEqual("\vètims\f");
        expect(words[2].replace("\rexalçar ")).toEqual("\rexaltar ");
        expect(words[3].replace("\xa0cavalcarà\u1680")).toEqual("\xa0correrà\u1680");
        expect(words[4].replace("\u180eआपका\u2000")).toEqual("\u180eHindi\u2000");
        expect(words[5].replace("\u2001מאראסט\u2002")).toEqual("\u2001Jiddisch\u2002");
        expect(words[6].replace("\u2003Каталония\u2006")).toEqual("\u2003Cyrillic\u2006");
        expect(words[7].replace("\u2007小亚细亚\u2008")).toEqual("\u2007Chinese\u2008");
        expect(words[8].replace("\u20091234\u200a")).toEqual("\u2009asdf\u200a");
        expect(words[9].replace("\u2028foo123\u2029")).toEqual("\u2028bar456\u2029");
        expect(words[10].replace("\u205f_underscore_\u3000")).toEqual("\u205f^_^\u3000");
      });

      it("should replace words between non-word characters", function() {
        expect(words[0].replace("(foo)")).toEqual("(bar)");
        expect(words[1].replace("[étimos]")).toEqual("[ètims]");
        expect(words[2].replace("{exalçar}")).toEqual("{exaltar}");
        expect(words[3].replace("<cavalcarà>")).toEqual("<correrà>");
        expect(words[4].replace("'आपका'")).toEqual("'Hindi'");
        expect(words[5].replace('"מאראסט"')).toEqual('"Jiddisch"');
        expect(words[6].replace("\\Каталония/")).toEqual("\\Cyrillic/");
        expect(words[7].replace("¿小亚细亚?")).toEqual("¿Chinese?");
        expect(words[8].replace("¡1234!")).toEqual("¡asdf!");
        expect(words[9].replace(".foo123:")).toEqual(".bar456:");
        expect(words[10].replace(",_underscore_;")).toEqual(",^_^;");
      });

    });

    describe("non-word characters", function() {

      var words;

      beforeEach(function() {
        words = [];
        words[0] = new Substitution("&", "and", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[1] = new Substitution("#", "|=|", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[2] = new Substitution("||", "or", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[3] = new Substitution("=", "equal", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[4] = new Substitution("+-", "pm", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[5] = new Substitution("*/", "as", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[6] = new Substitution("$", "€", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[7] = new Substitution("^", "â", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[8] = new Substitution(".:", "dots", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[9] = new Substitution(",;", "commas", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[10] = new Substitution("{[()]}", "V", true, Substitution.prototype.INPUT_WHOLE_WORDS);
      });

      it("should replace single words", function() {
        expect(words[0].replace("&")).toEqual("and");
        expect(words[1].replace("#")).toEqual("|=|");
        expect(words[2].replace("||")).toEqual("or");
        expect(words[3].replace("=")).toEqual("equal");
        expect(words[4].replace("+-")).toEqual("pm");
        expect(words[5].replace("*/")).toEqual("as");
        expect(words[6].replace("$")).toEqual("€");
        expect(words[7].replace("^")).toEqual("â");
        expect(words[8].replace(".:")).toEqual("dots");
        expect(words[9].replace(",;")).toEqual("commas");
        expect(words[10].replace("{[()]}")).toEqual("V");
      });

      it("should not replace non-whole words", function() {
        expect(words[0].replace("&&")).toEqual("&&");
        expect(words[1].replace("*#*")).toEqual("*#*");
        expect(words[2].replace("=||=")).toEqual("=||=");
        expect(words[3].replace("==")).toEqual("==");
        expect(words[4].replace("+-+-")).toEqual("+-+-");
        expect(words[5].replace("/**/")).toEqual("/**/");
        expect(words[6].replace("$@")).toEqual("$@");
        expect(words[7].replace("^^")).toEqual("^^");
        expect(words[8].replace("/.:/")).toEqual("/.:/");
        expect(words[9].replace("{,;}")).toEqual("{,;}");
        expect(words[10].replace("%{[()]}")).toEqual("%{[()]}");
      });

      it("should replace words between spaces", function() {
        expect(words[0].replace("\t&\n")).toEqual("\tand\n");
        expect(words[1].replace("\v#\f")).toEqual("\v|=|\f");
        expect(words[2].replace("\r|| ")).toEqual("\ror ");
        expect(words[3].replace("\xa0=\u1680")).toEqual("\xa0equal\u1680");
        expect(words[4].replace("\u180e+-\u2000")).toEqual("\u180epm\u2000");
        expect(words[5].replace("\u2001*/\u2002")).toEqual("\u2001as\u2002");
        expect(words[6].replace("\u2003$\u2006")).toEqual("\u2003€\u2006");
        expect(words[7].replace("\u2007^\u2008")).toEqual("\u2007â\u2008");
        expect(words[8].replace("\u2009.:\u200a")).toEqual("\u2009dots\u200a");
        expect(words[9].replace("\u2028,;\u2029")).toEqual("\u2028commas\u2029");
        expect(words[10].replace("\u205f{[()]}\u3000")).toEqual("\u205fV\u3000");
      });

      it("should replace words between word characters", function() {
        expect(words[0].replace("C&D")).toEqual("CandD");
        expect(words[1].replace("l#x")).toEqual("l|=|x");
        expect(words[2].replace("i||I")).toEqual("iorI");
        expect(words[3].replace("ç=ö")).toEqual("çequalö");
        expect(words[4].replace("瑝+-眦")).toEqual("瑝pm眦");
        expect(words[5].replace("埜*/觇")).toEqual("埜as觇");
        expect(words[6].replace("珶$ᖎ")).toEqual("珶€ᖎ");
        expect(words[7].replace("緆^齍")).toEqual("緆â齍");
        expect(words[8].replace("忌.:\uaa74")).toEqual("忌dots\uaa74");
        expect(words[9].replace("埭,;බ")).toEqual("埭commasබ");
        expect(words[10].replace("\u1a2d{[()]}圄")).toEqual("\u1a2dV圄");
      });

    });

    describe("separator characters", function() {

      var words;

      beforeEach(function() {
        words = [];
        words[0] = new Substitution(" ", "space", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[1] = new Substitution("\t", "tab", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[2] = new Substitution("\n", "newline", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[3] = new Substitution("\r", "return", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[4] = new Substitution("\v\f", "vf", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[5] = new Substitution("\xa0", "foo", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[6] = new Substitution("\u180e", "bar", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[7] = new Substitution("\u2000\u200a", "space separators", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[8] = new Substitution("\u2028\u2029", "lp separators", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[9] = new Substitution("\u205f", "20 5f", true, Substitution.prototype.INPUT_WHOLE_WORDS);
        words[10] = new Substitution("\u3000", "3k", true, Substitution.prototype.INPUT_WHOLE_WORDS);
      });

      it("should replace single words", function() {
        expect(words[0].replace(" ")).toEqual("space");
        expect(words[1].replace("\t")).toEqual("tab");
        expect(words[2].replace("\n")).toEqual("newline");
        expect(words[3].replace("\r")).toEqual("return");
        expect(words[4].replace("\v\f")).toEqual("vf");
        expect(words[5].replace("\xa0")).toEqual("foo");
        expect(words[6].replace("\u180e")).toEqual("bar");
        expect(words[7].replace("\u2000\u200a")).toEqual("space separators");
        expect(words[8].replace("\u2028\u2029")).toEqual("lp separators");
        expect(words[9].replace("\u205f")).toEqual("20 5f");
        expect(words[10].replace("\u3000")).toEqual("3k");
      });

      it("should not replace non-whole words", function() {
        expect(words[0].replace("  ")).toEqual("  ");
        expect(words[1].replace("\t ")).toEqual("\t ");
        expect(words[2].replace("\n ")).toEqual("\n ");
        expect(words[3].replace("\r ")).toEqual("\r ");
        expect(words[4].replace("\v\f ")).toEqual("\v\f ");
        expect(words[5].replace("\xa0 ")).toEqual("\xa0 ");
        expect(words[6].replace("\u180e ")).toEqual("\u180e ");
        expect(words[7].replace("\u2000\u200a ")).toEqual("\u2000\u200a ");
        expect(words[8].replace("\u2028\u2029 ")).toEqual("\u2028\u2029 ");
        expect(words[9].replace("\u205f ")).toEqual("\u205f ");
        expect(words[10].replace("\u3000 ")).toEqual("\u3000 ");
      });

      it("should replace words between word characters", function() {
        expect(words[0].replace("C D")).toEqual("CspaceD");
        expect(words[1].replace("l\tx")).toEqual("ltabx");
        expect(words[2].replace("i\nI")).toEqual("inewlineI");
        expect(words[3].replace("ç\rö")).toEqual("çreturnö");
        expect(words[4].replace("瑝\v\f眦")).toEqual("瑝vf眦");
        expect(words[5].replace("埜\xa0觇")).toEqual("埜foo觇");
        expect(words[6].replace("珶\u180eᖎ")).toEqual("珶barᖎ");
        expect(words[7].replace("緆\u2000\u200a齍")).toEqual("緆space separators齍");
        expect(words[8].replace("忌\u2028\u2029\uaa74")).toEqual("忌lp separators\uaa74");
        expect(words[9].replace("埭\u205fබ")).toEqual("埭20 5fබ");
        expect(words[10].replace("\u1a2d\u3000圄")).toEqual("\u1a2d3k圄");
      });

      it("should replace words between non-word characters", function() {
        expect(words[0].replace("( )")).toEqual("(space)");
        expect(words[1].replace("[\t]")).toEqual("[tab]");
        expect(words[2].replace("{\n}")).toEqual("{newline}");
        expect(words[3].replace("<\r>")).toEqual("<return>");
        expect(words[4].replace("'\v\f'")).toEqual("'vf'");
        expect(words[5].replace('"\xa0"')).toEqual('"foo"');
        expect(words[6].replace("\\\u180e/")).toEqual("\\bar/");
        expect(words[7].replace("¿\u2000\u200a?")).toEqual("¿space separators?");
        expect(words[8].replace("¡\u2028\u2029!")).toEqual("¡lp separators!");
        expect(words[9].replace(".\u205f:")).toEqual(".20 5f:");
        expect(words[10].replace(",\u3000;")).toEqual(",3k;");
      });

    });

  });

  describe("escaped characters", function() {

    it("should interpret '\\\\' as '\\'", function() {
      var substitution = new Substitution("\\\\", "backslash");
      expect(substitution.replace("\\\\")).toEqual("backslashbackslash");
    });

    it("should interpret '\\n' as newline", function() {
      var substitution = new Substitution("\\n", "newline");
      expect(substitution.replace("\\n\n\\n")).toEqual("\\nnewline\\n");
    });

    it("should interpret '\\r' as carriage return", function() {
      var substitution = new Substitution("\\r", "return");
      expect(substitution.replace("\\r\r\\r")).toEqual("\\rreturn\\r");
    });

    it("should interpret '\\t' as tab", function() {
      var substitution = new Substitution("\\t", "tab");
      expect(substitution.replace("\\t\t\\t")).toEqual("\\ttab\\t");
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
      var group = new SubstitutionGroup("", urls);
      expect(group.matches("www.example.com")).toBe(true);
      expect(group.matches("http://www.example.com/")).toBe(true);
      expect(group.matches("http://www.example.com/foo")).toBe(true);
      expect(group.matches("http://example.com/")).toBe(false);
    });

    it("should work with more than one URL", function() {
      var urls = ["example.com", "foo.net"];
      var group = new SubstitutionGroup("", urls);
      expect(group.matches("http://www.example.com/")).toBe(true);
      expect(group.matches("http://foo.net/")).toBe(true);
      expect(group.matches("http://bar.org/")).toBe(false);
    });

    it("should work with wildcards", function() {
      var urls = ["http://*.example.com", "http*://foo.*/fu*.html", "http://**.bar.org"];
      var group = new SubstitutionGroup("", urls);
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
      var group = new SubstitutionGroup("", urls);
      expect(group.matches("http://www.el-guió.cat/falç?v=%4Fg+42&x=_26")).toBe(true);
    });

    it("should work with anchors", function() {
      var urls = ["|ftp://www.example1.com/", "ftp://www.example2.com/|", "|ftp://www.example3.com/|"];
      var group = new SubstitutionGroup("", urls);
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
      var group = new SubstitutionGroup("", urls);
      expect(group.matches("http://www.example.com/")).toBe(true);
      expect(group.matches("http://www.example.com/foo")).toBe(true);
      expect(group.matches("http://www.example.com/bar")).toBe(false);
      expect(group.matches("http://foo.net/")).toBe(false);
    });

    it("should work with URLs starting with hyphens", function() {
      var urls = ["|*-example.com"];
      var group = new SubstitutionGroup("", urls);
      expect(group.matches("http://-example.com/")).toBe(true);
      expect(group.matches("http://some-example.com/")).toBe(true);
    });

  });

});
