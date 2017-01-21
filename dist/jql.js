(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.JQL = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var Query_1 = require("./query/Query");
exports.TableAs = Query_1.TableAs;
var JoinType_1 = require("./query/JoinType");
exports.JoinType = JoinType_1.JoinType;
var Table = (function () {
    function Table(rows) {
        this.rows = rows;
    }
    Table.prototype.query = function () {
        var query = new Query_1.Query();
        query.from(this);
        return query;
    };
    Table.prototype.all = function () {
        return this.rows;
    };
    return Table;
}());
exports.Table = Table;

},{"./query/JoinType":3,"./query/Query":4}],2:[function(require,module,exports){
"use strict";
var Query_1 = require("./Query");
var JoinType_1 = require("./JoinType");
var JoinExecution = (function () {
    function JoinExecution(otherTable, predicate, joinType) {
        this.otherTable = otherTable;
        this.predicate = predicate;
        this.joinType = joinType;
        this.joinStrategies = new Map([
            [JoinType_1.JoinType.INNER, JoinExecution.innerJoin],
            [JoinType_1.JoinType.LEFT, JoinExecution.leftJoin],
            [JoinType_1.JoinType.RIGHT, JoinExecution.rightJoin],
            [JoinType_1.JoinType.FULL, JoinExecution.fullJoin]
        ]);
    }
    JoinExecution.prototype.execute = function (intermediateResult) {
        var strategy = this.joinStrategies.get(this.joinType);
        return strategy(intermediateResult, this.otherTable, this.predicate);
    };
    JoinExecution.innerJoin = function (intermediateResult, otherTable, predicate) {
        var result = [];
        intermediateResult.forEach(function (tableRow) {
            otherTable.table.all().forEach(function (row) {
                var tableRowReference = tableRow.copy();
                tableRowReference.set(otherTable, row);
                if (predicate(tableRowReference)) {
                    result.push(tableRowReference);
                }
            });
        });
        return result;
    };
    JoinExecution.leftJoin = function (intermediateResult, otherTable, predicate) {
        var result = [];
        intermediateResult.forEach(function (tableRow) {
            var joined = false;
            otherTable.table.all().forEach(function (row) {
                var tableRowReference = tableRow.copy();
                tableRowReference.set(otherTable, row);
                if (predicate(tableRowReference)) {
                    result.push(tableRowReference);
                    joined = true;
                }
            });
            if (!joined) {
                result.push(tableRow);
            }
        });
        return result;
    };
    JoinExecution.rightJoin = function (intermediateResult, otherTable, predicate) {
        var result = [];
        otherTable.table.all().forEach(function (row) {
            var joined = false;
            intermediateResult.forEach(function (tableRow) {
                var tableRowReference = tableRow.copy();
                tableRowReference.set(otherTable, row);
                if (predicate(tableRowReference)) {
                    result.push(tableRowReference);
                    joined = true;
                }
            });
            if (!joined) {
                var tableRowReference = new Query_1.TableRowReference();
                tableRowReference.set(otherTable, row);
                result.push(tableRowReference);
            }
        });
        return result;
    };
    JoinExecution.fullJoin = function (intermediateResult, otherTable, predicate) {
        var result = JoinExecution.leftJoin(intermediateResult, otherTable, predicate);
        var joined = result.filter(function (row) { return row.has(otherTable); }).map(function (row) { return row.table(otherTable.table); });
        var joinedSet = new Set(joined);
        otherTable.table.all().forEach(function (row) {
            if (!joinedSet.has(row)) {
                var tableRowReference = new Query_1.TableRowReference();
                tableRowReference.set(otherTable, row);
                result.push(tableRowReference);
            }
        });
        return result;
    };
    return JoinExecution;
}());
exports.JoinExecution = JoinExecution;

},{"./JoinType":3,"./Query":4}],3:[function(require,module,exports){
"use strict";
var JoinType;
(function (JoinType) {
    JoinType[JoinType["LEFT"] = 0] = "LEFT";
    JoinType[JoinType["RIGHT"] = 1] = "RIGHT";
    JoinType[JoinType["INNER"] = 2] = "INNER";
    JoinType[JoinType["FULL"] = 3] = "FULL";
})(JoinType = exports.JoinType || (exports.JoinType = {}));

},{}],4:[function(require,module,exports){
"use strict";
var Table_1 = require("../Table");
var JoinExecution_1 = require("./JoinExecution");
var WhereExecution_1 = require("./WhereExecution");
var JoinType_1 = require("./JoinType");
var Query = (function () {
    function Query() {
        this.executions = [];
        this.tableReferences = new Map();
        this.selector = function (_) { return []; };
    }
    Query.prototype.select = function (selector) {
        this.selector = selector;
        return this;
    };
    Query.prototype.join = function (table, predicate, joinType) {
        if (joinType === void 0) { joinType = JoinType_1.JoinType.INNER; }
        var execution = new JoinExecution_1.JoinExecution(this.tableToTableSelection(table), predicate, joinType);
        this.executions.push(execution);
        return this;
    };
    Query.prototype.where = function (predicate) {
        this.executions.push(new WhereExecution_1.WhereExecution(predicate));
        return this;
    };
    Query.prototype.limit = function (limit) {
        this.take = limit;
        return this;
    };
    Query.prototype.offset = function (offset) {
        this.skip = offset;
        return this;
    };
    Query.prototype.from = function (table) {
        this.anchorTable = this.tableToTableSelection(table);
        return this;
    };
    Query.prototype.execute = function () {
        var anchorTable = this.anchorTable;
        var result = anchorTable.table.all().map(function (row) {
            var column = new TableRowReference();
            column.set(anchorTable, row);
            return column;
        });
        this.executions.forEach(function (execution) {
            result = execution.execute(result);
        });
        if (this.skip !== undefined) {
            result = result.slice(this.skip);
        }
        if (this.take !== undefined) {
            result.length = this.take;
        }
        return result.map(this.selector);
    };
    Query.prototype.tableToTableSelection = function (table) {
        if (table instanceof Table_1.Table) {
            return new TableAs(table);
        }
        return table;
    };
    return Query;
}());
exports.Query = Query;
var TableAs = (function () {
    function TableAs(table, as) {
        if (as === void 0) { as = null; }
        this.table = table;
        this.as = as;
    }
    return TableAs;
}());
exports.TableAs = TableAs;
var TableRowReference = (function () {
    function TableRowReference() {
        this.tableReference = new Map();
    }
    TableRowReference.prototype.table = function (tableReference) {
        return this.tableReference.get(tableReference);
    };
    TableRowReference.prototype.column = function (tableReference, columnReader) {
        if (this.tableReference.has(tableReference)) {
            return columnReader(this.tableReference.get(tableReference));
        }
        return null;
    };
    TableRowReference.prototype.has = function (table) {
        return this.tableReference.has(table.table);
    };
    TableRowReference.prototype.set = function (table, row) {
        if (table.as) {
            this.tableReference.set(table.as, row);
        }
        this.tableReference.set(table.table, row);
    };
    TableRowReference.prototype.copy = function () {
        var tableRowReference = new TableRowReference;
        this.tableReference.forEach(function (v, k) { return tableRowReference.tableReference.set(k, v); });
        return tableRowReference;
    };
    TableRowReference.prototype.clear = function () {
        this.tableReference.clear();
    };
    return TableRowReference;
}());
exports.TableRowReference = TableRowReference;

},{"../Table":1,"./JoinExecution":2,"./JoinType":3,"./WhereExecution":5}],5:[function(require,module,exports){
"use strict";
var WhereExecution = (function () {
    function WhereExecution(predicate) {
        this.predicate = predicate;
    }
    WhereExecution.prototype.execute = function (intermediateResult) {
        return intermediateResult.filter(this.predicate);
    };
    return WhereExecution;
}());
exports.WhereExecution = WhereExecution;

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvVGFibGUuanMiLCJzcmMvcXVlcnkvSm9pbkV4ZWN1dGlvbi5qcyIsInNyYy9xdWVyeS9Kb2luVHlwZS5qcyIsInNyYy9xdWVyeS9RdWVyeS5qcyIsInNyYy9xdWVyeS9XaGVyZUV4ZWN1dGlvbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xudmFyIFF1ZXJ5XzEgPSByZXF1aXJlKFwiLi9xdWVyeS9RdWVyeVwiKTtcbmV4cG9ydHMuVGFibGVBcyA9IFF1ZXJ5XzEuVGFibGVBcztcbnZhciBKb2luVHlwZV8xID0gcmVxdWlyZShcIi4vcXVlcnkvSm9pblR5cGVcIik7XG5leHBvcnRzLkpvaW5UeXBlID0gSm9pblR5cGVfMS5Kb2luVHlwZTtcbnZhciBUYWJsZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVGFibGUocm93cykge1xuICAgICAgICB0aGlzLnJvd3MgPSByb3dzO1xuICAgIH1cbiAgICBUYWJsZS5wcm90b3R5cGUucXVlcnkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IG5ldyBRdWVyeV8xLlF1ZXJ5KCk7XG4gICAgICAgIHF1ZXJ5LmZyb20odGhpcyk7XG4gICAgICAgIHJldHVybiBxdWVyeTtcbiAgICB9O1xuICAgIFRhYmxlLnByb3RvdHlwZS5hbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJvd3M7XG4gICAgfTtcbiAgICByZXR1cm4gVGFibGU7XG59KCkpO1xuZXhwb3J0cy5UYWJsZSA9IFRhYmxlO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgUXVlcnlfMSA9IHJlcXVpcmUoXCIuL1F1ZXJ5XCIpO1xudmFyIEpvaW5UeXBlXzEgPSByZXF1aXJlKFwiLi9Kb2luVHlwZVwiKTtcbnZhciBKb2luRXhlY3V0aW9uID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBKb2luRXhlY3V0aW9uKG90aGVyVGFibGUsIHByZWRpY2F0ZSwgam9pblR5cGUpIHtcbiAgICAgICAgdGhpcy5vdGhlclRhYmxlID0gb3RoZXJUYWJsZTtcbiAgICAgICAgdGhpcy5wcmVkaWNhdGUgPSBwcmVkaWNhdGU7XG4gICAgICAgIHRoaXMuam9pblR5cGUgPSBqb2luVHlwZTtcbiAgICAgICAgdGhpcy5qb2luU3RyYXRlZ2llcyA9IG5ldyBNYXAoW1xuICAgICAgICAgICAgW0pvaW5UeXBlXzEuSm9pblR5cGUuSU5ORVIsIEpvaW5FeGVjdXRpb24uaW5uZXJKb2luXSxcbiAgICAgICAgICAgIFtKb2luVHlwZV8xLkpvaW5UeXBlLkxFRlQsIEpvaW5FeGVjdXRpb24ubGVmdEpvaW5dLFxuICAgICAgICAgICAgW0pvaW5UeXBlXzEuSm9pblR5cGUuUklHSFQsIEpvaW5FeGVjdXRpb24ucmlnaHRKb2luXSxcbiAgICAgICAgICAgIFtKb2luVHlwZV8xLkpvaW5UeXBlLkZVTEwsIEpvaW5FeGVjdXRpb24uZnVsbEpvaW5dXG4gICAgICAgIF0pO1xuICAgIH1cbiAgICBKb2luRXhlY3V0aW9uLnByb3RvdHlwZS5leGVjdXRlID0gZnVuY3Rpb24gKGludGVybWVkaWF0ZVJlc3VsdCkge1xuICAgICAgICB2YXIgc3RyYXRlZ3kgPSB0aGlzLmpvaW5TdHJhdGVnaWVzLmdldCh0aGlzLmpvaW5UeXBlKTtcbiAgICAgICAgcmV0dXJuIHN0cmF0ZWd5KGludGVybWVkaWF0ZVJlc3VsdCwgdGhpcy5vdGhlclRhYmxlLCB0aGlzLnByZWRpY2F0ZSk7XG4gICAgfTtcbiAgICBKb2luRXhlY3V0aW9uLmlubmVySm9pbiA9IGZ1bmN0aW9uIChpbnRlcm1lZGlhdGVSZXN1bHQsIG90aGVyVGFibGUsIHByZWRpY2F0ZSkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICAgIGludGVybWVkaWF0ZVJlc3VsdC5mb3JFYWNoKGZ1bmN0aW9uICh0YWJsZVJvdykge1xuICAgICAgICAgICAgb3RoZXJUYWJsZS50YWJsZS5hbGwoKS5mb3JFYWNoKGZ1bmN0aW9uIChyb3cpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFibGVSb3dSZWZlcmVuY2UgPSB0YWJsZVJvdy5jb3B5KCk7XG4gICAgICAgICAgICAgICAgdGFibGVSb3dSZWZlcmVuY2Uuc2V0KG90aGVyVGFibGUsIHJvdyk7XG4gICAgICAgICAgICAgICAgaWYgKHByZWRpY2F0ZSh0YWJsZVJvd1JlZmVyZW5jZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2godGFibGVSb3dSZWZlcmVuY2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICAgIEpvaW5FeGVjdXRpb24ubGVmdEpvaW4gPSBmdW5jdGlvbiAoaW50ZXJtZWRpYXRlUmVzdWx0LCBvdGhlclRhYmxlLCBwcmVkaWNhdGUpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgICBpbnRlcm1lZGlhdGVSZXN1bHQuZm9yRWFjaChmdW5jdGlvbiAodGFibGVSb3cpIHtcbiAgICAgICAgICAgIHZhciBqb2luZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIG90aGVyVGFibGUudGFibGUuYWxsKCkuZm9yRWFjaChmdW5jdGlvbiAocm93KSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhYmxlUm93UmVmZXJlbmNlID0gdGFibGVSb3cuY29weSgpO1xuICAgICAgICAgICAgICAgIHRhYmxlUm93UmVmZXJlbmNlLnNldChvdGhlclRhYmxlLCByb3cpO1xuICAgICAgICAgICAgICAgIGlmIChwcmVkaWNhdGUodGFibGVSb3dSZWZlcmVuY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKHRhYmxlUm93UmVmZXJlbmNlKTtcbiAgICAgICAgICAgICAgICAgICAgam9pbmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICgham9pbmVkKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2godGFibGVSb3cpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICAgIEpvaW5FeGVjdXRpb24ucmlnaHRKb2luID0gZnVuY3Rpb24gKGludGVybWVkaWF0ZVJlc3VsdCwgb3RoZXJUYWJsZSwgcHJlZGljYXRlKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgICAgb3RoZXJUYWJsZS50YWJsZS5hbGwoKS5mb3JFYWNoKGZ1bmN0aW9uIChyb3cpIHtcbiAgICAgICAgICAgIHZhciBqb2luZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIGludGVybWVkaWF0ZVJlc3VsdC5mb3JFYWNoKGZ1bmN0aW9uICh0YWJsZVJvdykge1xuICAgICAgICAgICAgICAgIHZhciB0YWJsZVJvd1JlZmVyZW5jZSA9IHRhYmxlUm93LmNvcHkoKTtcbiAgICAgICAgICAgICAgICB0YWJsZVJvd1JlZmVyZW5jZS5zZXQob3RoZXJUYWJsZSwgcm93KTtcbiAgICAgICAgICAgICAgICBpZiAocHJlZGljYXRlKHRhYmxlUm93UmVmZXJlbmNlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaCh0YWJsZVJvd1JlZmVyZW5jZSk7XG4gICAgICAgICAgICAgICAgICAgIGpvaW5lZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIWpvaW5lZCkge1xuICAgICAgICAgICAgICAgIHZhciB0YWJsZVJvd1JlZmVyZW5jZSA9IG5ldyBRdWVyeV8xLlRhYmxlUm93UmVmZXJlbmNlKCk7XG4gICAgICAgICAgICAgICAgdGFibGVSb3dSZWZlcmVuY2Uuc2V0KG90aGVyVGFibGUsIHJvdyk7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2godGFibGVSb3dSZWZlcmVuY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICAgIEpvaW5FeGVjdXRpb24uZnVsbEpvaW4gPSBmdW5jdGlvbiAoaW50ZXJtZWRpYXRlUmVzdWx0LCBvdGhlclRhYmxlLCBwcmVkaWNhdGUpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IEpvaW5FeGVjdXRpb24ubGVmdEpvaW4oaW50ZXJtZWRpYXRlUmVzdWx0LCBvdGhlclRhYmxlLCBwcmVkaWNhdGUpO1xuICAgICAgICB2YXIgam9pbmVkID0gcmVzdWx0LmZpbHRlcihmdW5jdGlvbiAocm93KSB7IHJldHVybiByb3cuaGFzKG90aGVyVGFibGUpOyB9KS5tYXAoZnVuY3Rpb24gKHJvdykgeyByZXR1cm4gcm93LnRhYmxlKG90aGVyVGFibGUudGFibGUpOyB9KTtcbiAgICAgICAgdmFyIGpvaW5lZFNldCA9IG5ldyBTZXQoam9pbmVkKTtcbiAgICAgICAgb3RoZXJUYWJsZS50YWJsZS5hbGwoKS5mb3JFYWNoKGZ1bmN0aW9uIChyb3cpIHtcbiAgICAgICAgICAgIGlmICgham9pbmVkU2V0Lmhhcyhyb3cpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhYmxlUm93UmVmZXJlbmNlID0gbmV3IFF1ZXJ5XzEuVGFibGVSb3dSZWZlcmVuY2UoKTtcbiAgICAgICAgICAgICAgICB0YWJsZVJvd1JlZmVyZW5jZS5zZXQob3RoZXJUYWJsZSwgcm93KTtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaCh0YWJsZVJvd1JlZmVyZW5jZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gICAgcmV0dXJuIEpvaW5FeGVjdXRpb247XG59KCkpO1xuZXhwb3J0cy5Kb2luRXhlY3V0aW9uID0gSm9pbkV4ZWN1dGlvbjtcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIEpvaW5UeXBlO1xuKGZ1bmN0aW9uIChKb2luVHlwZSkge1xuICAgIEpvaW5UeXBlW0pvaW5UeXBlW1wiTEVGVFwiXSA9IDBdID0gXCJMRUZUXCI7XG4gICAgSm9pblR5cGVbSm9pblR5cGVbXCJSSUdIVFwiXSA9IDFdID0gXCJSSUdIVFwiO1xuICAgIEpvaW5UeXBlW0pvaW5UeXBlW1wiSU5ORVJcIl0gPSAyXSA9IFwiSU5ORVJcIjtcbiAgICBKb2luVHlwZVtKb2luVHlwZVtcIkZVTExcIl0gPSAzXSA9IFwiRlVMTFwiO1xufSkoSm9pblR5cGUgPSBleHBvcnRzLkpvaW5UeXBlIHx8IChleHBvcnRzLkpvaW5UeXBlID0ge30pKTtcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIFRhYmxlXzEgPSByZXF1aXJlKFwiLi4vVGFibGVcIik7XG52YXIgSm9pbkV4ZWN1dGlvbl8xID0gcmVxdWlyZShcIi4vSm9pbkV4ZWN1dGlvblwiKTtcbnZhciBXaGVyZUV4ZWN1dGlvbl8xID0gcmVxdWlyZShcIi4vV2hlcmVFeGVjdXRpb25cIik7XG52YXIgSm9pblR5cGVfMSA9IHJlcXVpcmUoXCIuL0pvaW5UeXBlXCIpO1xudmFyIFF1ZXJ5ID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBRdWVyeSgpIHtcbiAgICAgICAgdGhpcy5leGVjdXRpb25zID0gW107XG4gICAgICAgIHRoaXMudGFibGVSZWZlcmVuY2VzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLnNlbGVjdG9yID0gZnVuY3Rpb24gKF8pIHsgcmV0dXJuIFtdOyB9O1xuICAgIH1cbiAgICBRdWVyeS5wcm90b3R5cGUuc2VsZWN0ID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0b3IgPSBzZWxlY3RvcjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBRdWVyeS5wcm90b3R5cGUuam9pbiA9IGZ1bmN0aW9uICh0YWJsZSwgcHJlZGljYXRlLCBqb2luVHlwZSkge1xuICAgICAgICBpZiAoam9pblR5cGUgPT09IHZvaWQgMCkgeyBqb2luVHlwZSA9IEpvaW5UeXBlXzEuSm9pblR5cGUuSU5ORVI7IH1cbiAgICAgICAgdmFyIGV4ZWN1dGlvbiA9IG5ldyBKb2luRXhlY3V0aW9uXzEuSm9pbkV4ZWN1dGlvbih0aGlzLnRhYmxlVG9UYWJsZVNlbGVjdGlvbih0YWJsZSksIHByZWRpY2F0ZSwgam9pblR5cGUpO1xuICAgICAgICB0aGlzLmV4ZWN1dGlvbnMucHVzaChleGVjdXRpb24pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFF1ZXJ5LnByb3RvdHlwZS53aGVyZSA9IGZ1bmN0aW9uIChwcmVkaWNhdGUpIHtcbiAgICAgICAgdGhpcy5leGVjdXRpb25zLnB1c2gobmV3IFdoZXJlRXhlY3V0aW9uXzEuV2hlcmVFeGVjdXRpb24ocHJlZGljYXRlKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgUXVlcnkucHJvdG90eXBlLmxpbWl0ID0gZnVuY3Rpb24gKGxpbWl0KSB7XG4gICAgICAgIHRoaXMudGFrZSA9IGxpbWl0O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFF1ZXJ5LnByb3RvdHlwZS5vZmZzZXQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gICAgICAgIHRoaXMuc2tpcCA9IG9mZnNldDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBRdWVyeS5wcm90b3R5cGUuZnJvbSA9IGZ1bmN0aW9uICh0YWJsZSkge1xuICAgICAgICB0aGlzLmFuY2hvclRhYmxlID0gdGhpcy50YWJsZVRvVGFibGVTZWxlY3Rpb24odGFibGUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFF1ZXJ5LnByb3RvdHlwZS5leGVjdXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYW5jaG9yVGFibGUgPSB0aGlzLmFuY2hvclRhYmxlO1xuICAgICAgICB2YXIgcmVzdWx0ID0gYW5jaG9yVGFibGUudGFibGUuYWxsKCkubWFwKGZ1bmN0aW9uIChyb3cpIHtcbiAgICAgICAgICAgIHZhciBjb2x1bW4gPSBuZXcgVGFibGVSb3dSZWZlcmVuY2UoKTtcbiAgICAgICAgICAgIGNvbHVtbi5zZXQoYW5jaG9yVGFibGUsIHJvdyk7XG4gICAgICAgICAgICByZXR1cm4gY29sdW1uO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5leGVjdXRpb25zLmZvckVhY2goZnVuY3Rpb24gKGV4ZWN1dGlvbikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZXhlY3V0aW9uLmV4ZWN1dGUocmVzdWx0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh0aGlzLnNraXAgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0LnNsaWNlKHRoaXMuc2tpcCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMudGFrZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXN1bHQubGVuZ3RoID0gdGhpcy50YWtlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQubWFwKHRoaXMuc2VsZWN0b3IpO1xuICAgIH07XG4gICAgUXVlcnkucHJvdG90eXBlLnRhYmxlVG9UYWJsZVNlbGVjdGlvbiA9IGZ1bmN0aW9uICh0YWJsZSkge1xuICAgICAgICBpZiAodGFibGUgaW5zdGFuY2VvZiBUYWJsZV8xLlRhYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFRhYmxlQXModGFibGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0YWJsZTtcbiAgICB9O1xuICAgIHJldHVybiBRdWVyeTtcbn0oKSk7XG5leHBvcnRzLlF1ZXJ5ID0gUXVlcnk7XG52YXIgVGFibGVBcyA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVGFibGVBcyh0YWJsZSwgYXMpIHtcbiAgICAgICAgaWYgKGFzID09PSB2b2lkIDApIHsgYXMgPSBudWxsOyB9XG4gICAgICAgIHRoaXMudGFibGUgPSB0YWJsZTtcbiAgICAgICAgdGhpcy5hcyA9IGFzO1xuICAgIH1cbiAgICByZXR1cm4gVGFibGVBcztcbn0oKSk7XG5leHBvcnRzLlRhYmxlQXMgPSBUYWJsZUFzO1xudmFyIFRhYmxlUm93UmVmZXJlbmNlID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBUYWJsZVJvd1JlZmVyZW5jZSgpIHtcbiAgICAgICAgdGhpcy50YWJsZVJlZmVyZW5jZSA9IG5ldyBNYXAoKTtcbiAgICB9XG4gICAgVGFibGVSb3dSZWZlcmVuY2UucHJvdG90eXBlLnRhYmxlID0gZnVuY3Rpb24gKHRhYmxlUmVmZXJlbmNlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRhYmxlUmVmZXJlbmNlLmdldCh0YWJsZVJlZmVyZW5jZSk7XG4gICAgfTtcbiAgICBUYWJsZVJvd1JlZmVyZW5jZS5wcm90b3R5cGUuY29sdW1uID0gZnVuY3Rpb24gKHRhYmxlUmVmZXJlbmNlLCBjb2x1bW5SZWFkZXIpIHtcbiAgICAgICAgaWYgKHRoaXMudGFibGVSZWZlcmVuY2UuaGFzKHRhYmxlUmVmZXJlbmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbHVtblJlYWRlcih0aGlzLnRhYmxlUmVmZXJlbmNlLmdldCh0YWJsZVJlZmVyZW5jZSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH07XG4gICAgVGFibGVSb3dSZWZlcmVuY2UucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uICh0YWJsZSkge1xuICAgICAgICByZXR1cm4gdGhpcy50YWJsZVJlZmVyZW5jZS5oYXModGFibGUudGFibGUpO1xuICAgIH07XG4gICAgVGFibGVSb3dSZWZlcmVuY2UucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uICh0YWJsZSwgcm93KSB7XG4gICAgICAgIGlmICh0YWJsZS5hcykge1xuICAgICAgICAgICAgdGhpcy50YWJsZVJlZmVyZW5jZS5zZXQodGFibGUuYXMsIHJvdyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50YWJsZVJlZmVyZW5jZS5zZXQodGFibGUudGFibGUsIHJvdyk7XG4gICAgfTtcbiAgICBUYWJsZVJvd1JlZmVyZW5jZS5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRhYmxlUm93UmVmZXJlbmNlID0gbmV3IFRhYmxlUm93UmVmZXJlbmNlO1xuICAgICAgICB0aGlzLnRhYmxlUmVmZXJlbmNlLmZvckVhY2goZnVuY3Rpb24gKHYsIGspIHsgcmV0dXJuIHRhYmxlUm93UmVmZXJlbmNlLnRhYmxlUmVmZXJlbmNlLnNldChrLCB2KTsgfSk7XG4gICAgICAgIHJldHVybiB0YWJsZVJvd1JlZmVyZW5jZTtcbiAgICB9O1xuICAgIFRhYmxlUm93UmVmZXJlbmNlLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy50YWJsZVJlZmVyZW5jZS5jbGVhcigpO1xuICAgIH07XG4gICAgcmV0dXJuIFRhYmxlUm93UmVmZXJlbmNlO1xufSgpKTtcbmV4cG9ydHMuVGFibGVSb3dSZWZlcmVuY2UgPSBUYWJsZVJvd1JlZmVyZW5jZTtcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIFdoZXJlRXhlY3V0aW9uID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBXaGVyZUV4ZWN1dGlvbihwcmVkaWNhdGUpIHtcbiAgICAgICAgdGhpcy5wcmVkaWNhdGUgPSBwcmVkaWNhdGU7XG4gICAgfVxuICAgIFdoZXJlRXhlY3V0aW9uLnByb3RvdHlwZS5leGVjdXRlID0gZnVuY3Rpb24gKGludGVybWVkaWF0ZVJlc3VsdCkge1xuICAgICAgICByZXR1cm4gaW50ZXJtZWRpYXRlUmVzdWx0LmZpbHRlcih0aGlzLnByZWRpY2F0ZSk7XG4gICAgfTtcbiAgICByZXR1cm4gV2hlcmVFeGVjdXRpb247XG59KCkpO1xuZXhwb3J0cy5XaGVyZUV4ZWN1dGlvbiA9IFdoZXJlRXhlY3V0aW9uO1xuIl19
