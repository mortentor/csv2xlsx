const Csv2Json = (function() {
  /**
   * MIT License
   *
   * Copyright (c) 2019 Martin Drapeau
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   *
   * The above copyright notice and this permission notice shall be included in all
   * copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   * SOFTWARE.
   *
   *
   * Node:
   * const csv2json = require('./csv2json.js');
   * csv2json(csv, options)
   *
   * Browser:
   * CSVJSON.csv2json(csv, options)
   *
   * Converts CSV to JSON. Returns an object. Use JSON.stringify to convert to a string.
   *
   * Available options:
   *  - separator: Optional. Character which acts as separator. If omitted,
   *               will attempt to detect comma (,), semi-colon (;) or tab (\t).
   *  - parseNumbers: Optional. Will attempt to convert a value to a number, if possible.
   *  - parseJSON: Optional. Will attempt to convert a value to a valid JSON value if possible.
   *               Detects numbers, null, false, true, [] and {}.
   *  - transpose: Optional. Will pivot the table. Default is false.
   *  - hash: Optional. Will use the first column as a key and return a hash instead of
   *               an array of objects. Default is false.
   *
   * Copyright (c) 2014-2019 Martin Drapeau
   *
   */

  var errorDetectingSeparator = "We could not detect the separator.",
      errorNotWellFormed = "CSV is not well formed",
      errorEmpty = "Empty CSV. Please provide something.",
      errorEmptyHeader = "Could not detect header. Ensure first row contains your column headers.",
      separators = [",", ";", "\t"],
      pegjsSeparatorNames = {
        ",": "comma",
        ";": "semicolon",
        "\t": "tab"
      };

  // Picks the separator we find the most.
  function detectSeparator(csv) {
    var counts = {},
        sepMax;
    separators.forEach(function(sep, i) {
      var re = new RegExp(sep, 'g');
      counts[sep] = (csv.match(re) || []).length;
      sepMax = !sepMax || counts[sep] > counts[sepMax] ? sep : sepMax;
    });
    return sepMax;
  }

  // Source: https://stackoverflow.com/questions/4856717/javascript-equivalent-of-pythons-zip-function
  function zip() {
    var args = [].slice.call(arguments);
    var longest = args.reduce(function(a,b) {
      return a.length>b.length ? a : b;
    }, []);

    return longest.map(function(_,i) {
      return args.map(function(array) {
        return array[i];
      });
    });
  }

  function uniquify(keys) {
    var counts = {};
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (counts[key] === undefined) {
        counts[key] = 0;
      } else {
        counts[key]++;
      }
    }

    var result = [];
    for (var i = keys.length-1; i >= 0; i--) {
      var key = keys[i];
      if (counts[key] > 0) key = key + '__' + counts[key]--;
      result.unshift(key);
    }

    return result;
  }

  function convert(csv, options) {
    options || (options = {});
    if (csv.length == 0) throw errorEmpty;

    var separator = options.separator || detectSeparator(csv);
    if (!separator) throw errorDetectingSeparator;

    var a = [];
    try {
      var a = csvParser.parse(csv, pegjsSeparatorNames[separator]);
    } catch(error) {
      var start = csv.lastIndexOf('\n', error.offset),
          end = csv.indexOf('\n', error.offset),
          line = csv.substring(start >= -1 ? start : 0, end > -1 ? end : csv.length);
      throw error.message + ' On line ' + error.line + ' and column ' + error.column + '.\n' + line;
    }

    if (options.transpose) {
        a = zip.apply(this, a);
    }
    if (options.returnArray) {
        return a;
    }

    var keys = a.shift();

    if (keys.length == 0) throw errorEmptyHeader;
    keys = keys.map(function(key) {
      return key.trim().replace(/(^")|("$)/g, '');
    });

    keys = uniquify(keys);

    var	json = options.hash ? {} : [];
    for (var l = 0; l < a.length; l++) {
      var row = {},
      hashKey;
      for (var i = 0; i < keys.length; i++) {
        var value = (a[l][i]||'').trim().replace(/(^")|("$)/g, '');
        var number = value === "" ? NaN : value - 0;
        if (options.hash && i == 0) {
          hashKey = value;
        }
        else {
          if (options.parseJSON || options.parseNumbers && !isNaN(number)) {
            try {
              row[keys[i]] = JSON.parse(value);
            } catch(error) {
              row[keys[i]] = value;
            }
          }
          else {
            row[keys[i]] = value;
          }
        }
      }
      if (options.hash)
        json[hashKey] = row;
      else
        json.push(row);
    }

    return json;
  };

  var csvParser = (function(){
    /*
     * Generated by PEG.js 0.7.0.
     *
     * http://pegjs.majda.cz/
     *
     * source: https://gist.github.com/trevordixon/3362830
     * Martin 2018-04-2: Added parse_semicolon function.
     *
     */

    function quote(s) {
      /*
       * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a
       * string literal except for the closing quote character, backslash,
       * carriage return, line separator, paragraph separator, and line feed.
       * Any character may appear in the form of an escape sequence.
       *
       * For portability, we also escape escape all control and non-ASCII
       * characters. Note that "\0" and "\v" escape sequences are not used
       * because JSHint does not like the first and IE the second.
       */
       return '"' + s
        .replace(/\\/g, '\\\\')  // backslash
        .replace(/"/g, '\\"')    // closing quote character
        .replace(/\x08/g, '\\b') // backspace
        .replace(/\t/g, '\\t')   // horizontal tab
        .replace(/\n/g, '\\n')   // line feed
        .replace(/\f/g, '\\f')   // form feed
        .replace(/\r/g, '\\r')   // carriage return
        .replace(/[\x00-\x07\x0B\x0E-\x1F\x80-\uFFFF]/g, escape)
        + '"';
    }

    var result = {
      /*
       * Parses the input with a generated parser. If the parsing is successfull,
       * returns a value explicitly or implicitly specified by the grammar from
       * which the parser was generated (see |PEG.buildParser|). If the parsing is
       * unsuccessful, throws |PEG.parser.SyntaxError| describing the error.
       */
      parse: function(input, startRule) {
        var parseFunctions = {
          "comma": parse_comma,
          "semicolon": parse_semicolon,
          "tab": parse_tab,
          "sv": parse_sv,
          "line": parse_line,
          "field": parse_field,
          "char": parse_char
        };

        if (startRule !== undefined) {
          if (parseFunctions[startRule] === undefined) {
            throw new Error("Invalid rule name: " + quote(startRule) + ".");
          }
        } else {
          startRule = "comma";
        }

        var pos = 0;
        var reportFailures = 0;
        var rightmostFailuresPos = 0;
        var rightmostFailuresExpected = [];

        function padLeft(input, padding, length) {
          var result = input;

          var padLength = length - input.length;
          for (var i = 0; i < padLength; i++) {
            result = padding + result;
          }

          return result;
        }

        function escape(ch) {
          var charCode = ch.charCodeAt(0);
          var escapeChar;
          var length;

          if (charCode <= 0xFF) {
            escapeChar = 'x';
            length = 2;
          } else {
            escapeChar = 'u';
            length = 4;
          }

          return '\\' + escapeChar + padLeft(charCode.toString(16).toUpperCase(), '0', length);
        }

        function matchFailed(failure) {
          if (pos < rightmostFailuresPos) {
            return;
          }

          if (pos > rightmostFailuresPos) {
            rightmostFailuresPos = pos;
            rightmostFailuresExpected = [];
          }

          rightmostFailuresExpected.push(failure);
        }

        function parse_comma() {
          var result0, result1;
          var pos0, pos1;

          pos0 = pos;
          pos1 = pos;
          result0 = (function(offset) { return separator = ','; })(pos) ? "" : null;
          if (result0 !== null) {
            result1 = parse_sv();
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, sv) { return sv; })(pos0, result0[1]);
          }
          if (result0 === null) {
            pos = pos0;
          }
          return result0;
        }

        function parse_semicolon() {
          var result0, result1;
          var pos0, pos1;

          pos0 = pos;
          pos1 = pos;
          result0 = (function(offset) { return separator = ';'; })(pos) ? "" : null;
          if (result0 !== null) {
            result1 = parse_sv();
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, sv) { return sv; })(pos0, result0[1]);
          }
          if (result0 === null) {
            pos = pos0;
          }
          return result0;
        }

        function parse_tab() {
          var result0, result1;
          var pos0, pos1;

          pos0 = pos;
          pos1 = pos;
          result0 = (function(offset) { return separator = '\t'; })(pos) ? "" : null;
          if (result0 !== null) {
            result1 = parse_sv();
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, sv) { return sv; })(pos0, result0[1]);
          }
          if (result0 === null) {
            pos = pos0;
          }
          return result0;
        }

        function parse_sv() {
          var result0, result1, result2, result3, result4;
          var pos0, pos1, pos2, pos3;

          pos0 = pos;
          pos1 = pos;
          result0 = [];
          if (/^[\n\r]/.test(input.charAt(pos))) {
            result1 = input.charAt(pos);
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("[\\n\\r]");
            }
          }
          while (result1 !== null) {
            result0.push(result1);
            if (/^[\n\r]/.test(input.charAt(pos))) {
              result1 = input.charAt(pos);
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[\\n\\r]");
              }
            }
          }
          if (result0 !== null) {
            result1 = parse_line();
            if (result1 !== null) {
              result2 = [];
              pos2 = pos;
              pos3 = pos;
              if (/^[\n\r]/.test(input.charAt(pos))) {
                result4 = input.charAt(pos);
                pos++;
              } else {
                result4 = null;
                if (reportFailures === 0) {
                  matchFailed("[\\n\\r]");
                }
              }
              if (result4 !== null) {
                result3 = [];
                while (result4 !== null) {
                  result3.push(result4);
                  if (/^[\n\r]/.test(input.charAt(pos))) {
                    result4 = input.charAt(pos);
                    pos++;
                  } else {
                    result4 = null;
                    if (reportFailures === 0) {
                      matchFailed("[\\n\\r]");
                    }
                  }
                }
              } else {
                result3 = null;
              }
              if (result3 !== null) {
                result4 = parse_line();
                if (result4 !== null) {
                  result3 = [result3, result4];
                } else {
                  result3 = null;
                  pos = pos3;
                }
              } else {
                result3 = null;
                pos = pos3;
              }
              if (result3 !== null) {
                result3 = (function(offset, data) { return data; })(pos2, result3[1]);
              }
              if (result3 === null) {
                pos = pos2;
              }
              while (result3 !== null) {
                result2.push(result3);
                pos2 = pos;
                pos3 = pos;
                if (/^[\n\r]/.test(input.charAt(pos))) {
                  result4 = input.charAt(pos);
                  pos++;
                } else {
                  result4 = null;
                  if (reportFailures === 0) {
                    matchFailed("[\\n\\r]");
                  }
                }
                if (result4 !== null) {
                  result3 = [];
                  while (result4 !== null) {
                    result3.push(result4);
                    if (/^[\n\r]/.test(input.charAt(pos))) {
                      result4 = input.charAt(pos);
                      pos++;
                    } else {
                      result4 = null;
                      if (reportFailures === 0) {
                        matchFailed("[\\n\\r]");
                      }
                    }
                  }
                } else {
                  result3 = null;
                }
                if (result3 !== null) {
                  result4 = parse_line();
                  if (result4 !== null) {
                    result3 = [result3, result4];
                  } else {
                    result3 = null;
                    pos = pos3;
                  }
                } else {
                  result3 = null;
                  pos = pos3;
                }
                if (result3 !== null) {
                  result3 = (function(offset, data) { return data; })(pos2, result3[1]);
                }
                if (result3 === null) {
                  pos = pos2;
                }
              }
              if (result2 !== null) {
                result3 = [];
                if (/^[\n\r]/.test(input.charAt(pos))) {
                  result4 = input.charAt(pos);
                  pos++;
                } else {
                  result4 = null;
                  if (reportFailures === 0) {
                    matchFailed("[\\n\\r]");
                  }
                }
                while (result4 !== null) {
                  result3.push(result4);
                  if (/^[\n\r]/.test(input.charAt(pos))) {
                    result4 = input.charAt(pos);
                    pos++;
                  } else {
                    result4 = null;
                    if (reportFailures === 0) {
                      matchFailed("[\\n\\r]");
                    }
                  }
                }
                if (result3 !== null) {
                  result0 = [result0, result1, result2, result3];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, first, rest) { rest.unshift(first); return rest; })(pos0, result0[1], result0[2]);
          }
          if (result0 === null) {
            pos = pos0;
          }
          return result0;
        }

        function parse_line() {
          var result0, result1, result2, result3, result4;
          var pos0, pos1, pos2, pos3;

          pos0 = pos;
          pos1 = pos;
          result0 = parse_field();
          if (result0 !== null) {
            result1 = [];
            pos2 = pos;
            pos3 = pos;
            if (input.length > pos) {
              result2 = input.charAt(pos);
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("any character");
              }
            }
            if (result2 !== null) {
              result3 = (function(offset, char) { return char == separator; })(pos, result2) ? "" : null;
              if (result3 !== null) {
                result4 = parse_field();
                if (result4 !== null) {
                  result2 = [result2, result3, result4];
                } else {
                  result2 = null;
                  pos = pos3;
                }
              } else {
                result2 = null;
                pos = pos3;
              }
            } else {
              result2 = null;
              pos = pos3;
            }
            if (result2 !== null) {
              result2 = (function(offset, char, text) { return text; })(pos2, result2[0], result2[2]);
            }
            if (result2 === null) {
              pos = pos2;
            }
            while (result2 !== null) {
              result1.push(result2);
              pos2 = pos;
              pos3 = pos;
              if (input.length > pos) {
                result2 = input.charAt(pos);
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("any character");
                }
              }
              if (result2 !== null) {
                result3 = (function(offset, char) { return char == separator; })(pos, result2) ? "" : null;
                if (result3 !== null) {
                  result4 = parse_field();
                  if (result4 !== null) {
                    result2 = [result2, result3, result4];
                  } else {
                    result2 = null;
                    pos = pos3;
                  }
                } else {
                  result2 = null;
                  pos = pos3;
                }
              } else {
                result2 = null;
                pos = pos3;
              }
              if (result2 !== null) {
                result2 = (function(offset, char, text) { return text; })(pos2, result2[0], result2[2]);
              }
              if (result2 === null) {
                pos = pos2;
              }
            }
            if (result1 !== null) {
              result2 = (function(offset, first, rest) { return !!first || rest.length; })(pos, result0, result1) ? "" : null;
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, first, rest) { rest.unshift(first); return rest; })(pos0, result0[0], result0[1]);
          }
          if (result0 === null) {
            pos = pos0;
          }
          return result0;
        }

        function parse_field() {
          var result0, result1, result2;
          var pos0, pos1, pos2;

          pos0 = pos;
          pos1 = pos;
          if (input.charCodeAt(pos) === 34) {
            result0 = "\"";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"\\\"\"");
            }
          }
          if (result0 !== null) {
            result1 = [];
            result2 = parse_char();
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_char();
            }
            if (result1 !== null) {
              if (input.charCodeAt(pos) === 34) {
                result2 = "\"";
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"\\\"\"");
                }
              }
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, text) { return text.join(''); })(pos0, result0[1]);
          }
          if (result0 === null) {
            pos = pos0;
          }
          if (result0 === null) {
            pos0 = pos;
            result0 = [];
            pos1 = pos;
            pos2 = pos;
            if (/^[^\n\r]/.test(input.charAt(pos))) {
              result1 = input.charAt(pos);
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[^\\n\\r]");
              }
            }
            if (result1 !== null) {
              result2 = (function(offset, char) { return char != separator; })(pos, result1) ? "" : null;
              if (result2 !== null) {
                result1 = [result1, result2];
              } else {
                result1 = null;
                pos = pos2;
              }
            } else {
              result1 = null;
              pos = pos2;
            }
            if (result1 !== null) {
              result1 = (function(offset, char) { return char; })(pos1, result1[0]);
            }
            if (result1 === null) {
              pos = pos1;
            }
            while (result1 !== null) {
              result0.push(result1);
              pos1 = pos;
              pos2 = pos;
              if (/^[^\n\r]/.test(input.charAt(pos))) {
                result1 = input.charAt(pos);
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("[^\\n\\r]");
                }
              }
              if (result1 !== null) {
                result2 = (function(offset, char) { return char != separator; })(pos, result1) ? "" : null;
                if (result2 !== null) {
                  result1 = [result1, result2];
                } else {
                  result1 = null;
                  pos = pos2;
                }
              } else {
                result1 = null;
                pos = pos2;
              }
              if (result1 !== null) {
                result1 = (function(offset, char) { return char; })(pos1, result1[0]);
              }
              if (result1 === null) {
                pos = pos1;
              }
            }
            if (result0 !== null) {
              result0 = (function(offset, text) { return text.join(''); })(pos0, result0);
            }
            if (result0 === null) {
              pos = pos0;
            }
          }
          return result0;
        }

        function parse_char() {
          var result0, result1;
          var pos0, pos1;

          pos0 = pos;
          pos1 = pos;
          if (input.charCodeAt(pos) === 34) {
            result0 = "\"";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"\\\"\"");
            }
          }
          if (result0 !== null) {
            if (input.charCodeAt(pos) === 34) {
              result1 = "\"";
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"\\\"\"");
              }
            }
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset) { return '"'; })(pos0);
          }
          if (result0 === null) {
            pos = pos0;
          }
          if (result0 === null) {
            if (/^[^"]/.test(input.charAt(pos))) {
              result0 = input.charAt(pos);
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("[^\"]");
              }
            }
          }
          return result0;
        }


        function cleanupExpected(expected) {
          expected.sort();

          var lastExpected = null;
          var cleanExpected = [];
          for (var i = 0; i < expected.length; i++) {
            if (expected[i] !== lastExpected) {
              cleanExpected.push(expected[i]);
              lastExpected = expected[i];
            }
          }
          return cleanExpected;
        }

        function computeErrorPosition() {
          /*
           * The first idea was to use |String.split| to break the input up to the
           * error position along newlines and derive the line and column from
           * there. However IE's |split| implementation is so broken that it was
           * enough to prevent it.
           */

          var line = 1;
          var column = 1;
          var seenCR = false;

          for (var i = 0; i < Math.max(pos, rightmostFailuresPos); i++) {
            var ch = input.charAt(i);
            if (ch === "\n") {
              if (!seenCR) { line++; }
              column = 1;
              seenCR = false;
            } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
              line++;
              column = 1;
              seenCR = true;
            } else {
              column++;
              seenCR = false;
            }
          }

          return { line: line, column: column };
        }


          var separator = ',';


        var result = parseFunctions[startRule]();

        /*
         * The parser is now in one of the following three states:
         *
         * 1. The parser successfully parsed the whole input.
         *
         *    - |result !== null|
         *    - |pos === input.length|
         *    - |rightmostFailuresExpected| may or may not contain something
         *
         * 2. The parser successfully parsed only a part of the input.
         *
         *    - |result !== null|
         *    - |pos < input.length|
         *    - |rightmostFailuresExpected| may or may not contain something
         *
         * 3. The parser did not successfully parse any part of the input.
         *
         *   - |result === null|
         *   - |pos === 0|
         *   - |rightmostFailuresExpected| contains at least one failure
         *
         * All code following this comment (including called functions) must
         * handle these states.
         */
        if (result === null || pos !== input.length) {
          var offset = Math.max(pos, rightmostFailuresPos);
          var found = offset < input.length ? input.charAt(offset) : null;
          var errorPosition = computeErrorPosition();

          throw new this.SyntaxError(
            cleanupExpected(rightmostFailuresExpected),
            found,
            offset,
            errorPosition.line,
            errorPosition.column
          );
        }

        return result;
      },

      /* Returns the parser source code. */
      toSource: function() { return this._source; }
    };

    /* Thrown when a parser encounters a syntax error. */

    result.SyntaxError = function(expected, found, offset, line, column) {
      function buildMessage(expected, found) {
        var expectedHumanized, foundHumanized;

        switch (expected.length) {
          case 0:
            expectedHumanized = "end of input";
            break;
          case 1:
            expectedHumanized = expected[0];
            break;
          default:
            expectedHumanized = expected.slice(0, expected.length - 1).join(", ")
              + " or "
              + expected[expected.length - 1];
        }

        foundHumanized = found ? quote(found) : "end of input";

        return "Expected " + expectedHumanized + " but " + foundHumanized + " found.";
      }

      this.name = "SyntaxError";
      this.expected = expected;
      this.found = found;
      this.message = buildMessage(expected, found);
      this.offset = offset;
      this.line = line;
      this.column = column;
    };

    result.SyntaxError.prototype = Error.prototype;

    return result;
  })();

/*
  // CommonJS or Browser
  if (typeof exports !== 'undefined') {
      if (typeof module !== 'undefined' && module.exports) {
          exports = module.exports = convert;
      }
      exports.csv2json = convert;
  } else {
    this.CSVJSON || (this.CSVJSON = {});
    this.CSVJSON.csv2json = convert;
  }
*/
    return convert;
}).call(this);


export { Csv2Json };