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
            [JoinType_1.JoinType.FULL, JoinExecution.fullJoin],
            [JoinType_1.JoinType.CROSS, JoinExecution.crossJoin]
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
    JoinExecution.crossJoin = function (intermediateResult, otherTable, predicate) {
        return JoinExecution.innerJoin(intermediateResult, otherTable, function () { return true; });
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
    JoinType[JoinType["CROSS"] = 4] = "CROSS";
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
        if (predicate === void 0) { predicate = function () { return true; }; }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvVGFibGUuanMiLCJzcmMvcXVlcnkvSm9pbkV4ZWN1dGlvbi5qcyIsInNyYy9xdWVyeS9Kb2luVHlwZS5qcyIsInNyYy9xdWVyeS9RdWVyeS5qcyIsInNyYy9xdWVyeS9XaGVyZUV4ZWN1dGlvbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xudmFyIFF1ZXJ5XzEgPSByZXF1aXJlKFwiLi9xdWVyeS9RdWVyeVwiKTtcbmV4cG9ydHMuVGFibGVBcyA9IFF1ZXJ5XzEuVGFibGVBcztcbnZhciBKb2luVHlwZV8xID0gcmVxdWlyZShcIi4vcXVlcnkvSm9pblR5cGVcIik7XG5leHBvcnRzLkpvaW5UeXBlID0gSm9pblR5cGVfMS5Kb2luVHlwZTtcbnZhciBUYWJsZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVGFibGUocm93cykge1xuICAgICAgICB0aGlzLnJvd3MgPSByb3dzO1xuICAgIH1cbiAgICBUYWJsZS5wcm90b3R5cGUucXVlcnkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IG5ldyBRdWVyeV8xLlF1ZXJ5KCk7XG4gICAgICAgIHF1ZXJ5LmZyb20odGhpcyk7XG4gICAgICAgIHJldHVybiBxdWVyeTtcbiAgICB9O1xuICAgIFRhYmxlLnByb3RvdHlwZS5hbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJvd3M7XG4gICAgfTtcbiAgICByZXR1cm4gVGFibGU7XG59KCkpO1xuZXhwb3J0cy5UYWJsZSA9IFRhYmxlO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgUXVlcnlfMSA9IHJlcXVpcmUoXCIuL1F1ZXJ5XCIpO1xudmFyIEpvaW5UeXBlXzEgPSByZXF1aXJlKFwiLi9Kb2luVHlwZVwiKTtcbnZhciBKb2luRXhlY3V0aW9uID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBKb2luRXhlY3V0aW9uKG90aGVyVGFibGUsIHByZWRpY2F0ZSwgam9pblR5cGUpIHtcbiAgICAgICAgdGhpcy5vdGhlclRhYmxlID0gb3RoZXJUYWJsZTtcbiAgICAgICAgdGhpcy5wcmVkaWNhdGUgPSBwcmVkaWNhdGU7XG4gICAgICAgIHRoaXMuam9pblR5cGUgPSBqb2luVHlwZTtcbiAgICAgICAgdGhpcy5qb2luU3RyYXRlZ2llcyA9IG5ldyBNYXAoW1xuICAgICAgICAgICAgW0pvaW5UeXBlXzEuSm9pblR5cGUuSU5ORVIsIEpvaW5FeGVjdXRpb24uaW5uZXJKb2luXSxcbiAgICAgICAgICAgIFtKb2luVHlwZV8xLkpvaW5UeXBlLkxFRlQsIEpvaW5FeGVjdXRpb24ubGVmdEpvaW5dLFxuICAgICAgICAgICAgW0pvaW5UeXBlXzEuSm9pblR5cGUuUklHSFQsIEpvaW5FeGVjdXRpb24ucmlnaHRKb2luXSxcbiAgICAgICAgICAgIFtKb2luVHlwZV8xLkpvaW5UeXBlLkZVTEwsIEpvaW5FeGVjdXRpb24uZnVsbEpvaW5dLFxuICAgICAgICAgICAgW0pvaW5UeXBlXzEuSm9pblR5cGUuQ1JPU1MsIEpvaW5FeGVjdXRpb24uY3Jvc3NKb2luXVxuICAgICAgICBdKTtcbiAgICB9XG4gICAgSm9pbkV4ZWN1dGlvbi5wcm90b3R5cGUuZXhlY3V0ZSA9IGZ1bmN0aW9uIChpbnRlcm1lZGlhdGVSZXN1bHQpIHtcbiAgICAgICAgdmFyIHN0cmF0ZWd5ID0gdGhpcy5qb2luU3RyYXRlZ2llcy5nZXQodGhpcy5qb2luVHlwZSk7XG4gICAgICAgIHJldHVybiBzdHJhdGVneShpbnRlcm1lZGlhdGVSZXN1bHQsIHRoaXMub3RoZXJUYWJsZSwgdGhpcy5wcmVkaWNhdGUpO1xuICAgIH07XG4gICAgSm9pbkV4ZWN1dGlvbi5pbm5lckpvaW4gPSBmdW5jdGlvbiAoaW50ZXJtZWRpYXRlUmVzdWx0LCBvdGhlclRhYmxlLCBwcmVkaWNhdGUpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgICBpbnRlcm1lZGlhdGVSZXN1bHQuZm9yRWFjaChmdW5jdGlvbiAodGFibGVSb3cpIHtcbiAgICAgICAgICAgIG90aGVyVGFibGUudGFibGUuYWxsKCkuZm9yRWFjaChmdW5jdGlvbiAocm93KSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhYmxlUm93UmVmZXJlbmNlID0gdGFibGVSb3cuY29weSgpO1xuICAgICAgICAgICAgICAgIHRhYmxlUm93UmVmZXJlbmNlLnNldChvdGhlclRhYmxlLCByb3cpO1xuICAgICAgICAgICAgICAgIGlmIChwcmVkaWNhdGUodGFibGVSb3dSZWZlcmVuY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKHRhYmxlUm93UmVmZXJlbmNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgICBKb2luRXhlY3V0aW9uLmxlZnRKb2luID0gZnVuY3Rpb24gKGludGVybWVkaWF0ZVJlc3VsdCwgb3RoZXJUYWJsZSwgcHJlZGljYXRlKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgICAgaW50ZXJtZWRpYXRlUmVzdWx0LmZvckVhY2goZnVuY3Rpb24gKHRhYmxlUm93KSB7XG4gICAgICAgICAgICB2YXIgam9pbmVkID0gZmFsc2U7XG4gICAgICAgICAgICBvdGhlclRhYmxlLnRhYmxlLmFsbCgpLmZvckVhY2goZnVuY3Rpb24gKHJvdykge1xuICAgICAgICAgICAgICAgIHZhciB0YWJsZVJvd1JlZmVyZW5jZSA9IHRhYmxlUm93LmNvcHkoKTtcbiAgICAgICAgICAgICAgICB0YWJsZVJvd1JlZmVyZW5jZS5zZXQob3RoZXJUYWJsZSwgcm93KTtcbiAgICAgICAgICAgICAgICBpZiAocHJlZGljYXRlKHRhYmxlUm93UmVmZXJlbmNlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaCh0YWJsZVJvd1JlZmVyZW5jZSk7XG4gICAgICAgICAgICAgICAgICAgIGpvaW5lZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIWpvaW5lZCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKHRhYmxlUm93KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgICBKb2luRXhlY3V0aW9uLnJpZ2h0Sm9pbiA9IGZ1bmN0aW9uIChpbnRlcm1lZGlhdGVSZXN1bHQsIG90aGVyVGFibGUsIHByZWRpY2F0ZSkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICAgIG90aGVyVGFibGUudGFibGUuYWxsKCkuZm9yRWFjaChmdW5jdGlvbiAocm93KSB7XG4gICAgICAgICAgICB2YXIgam9pbmVkID0gZmFsc2U7XG4gICAgICAgICAgICBpbnRlcm1lZGlhdGVSZXN1bHQuZm9yRWFjaChmdW5jdGlvbiAodGFibGVSb3cpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFibGVSb3dSZWZlcmVuY2UgPSB0YWJsZVJvdy5jb3B5KCk7XG4gICAgICAgICAgICAgICAgdGFibGVSb3dSZWZlcmVuY2Uuc2V0KG90aGVyVGFibGUsIHJvdyk7XG4gICAgICAgICAgICAgICAgaWYgKHByZWRpY2F0ZSh0YWJsZVJvd1JlZmVyZW5jZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2godGFibGVSb3dSZWZlcmVuY2UpO1xuICAgICAgICAgICAgICAgICAgICBqb2luZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFqb2luZWQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFibGVSb3dSZWZlcmVuY2UgPSBuZXcgUXVlcnlfMS5UYWJsZVJvd1JlZmVyZW5jZSgpO1xuICAgICAgICAgICAgICAgIHRhYmxlUm93UmVmZXJlbmNlLnNldChvdGhlclRhYmxlLCByb3cpO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKHRhYmxlUm93UmVmZXJlbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgICBKb2luRXhlY3V0aW9uLmZ1bGxKb2luID0gZnVuY3Rpb24gKGludGVybWVkaWF0ZVJlc3VsdCwgb3RoZXJUYWJsZSwgcHJlZGljYXRlKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBKb2luRXhlY3V0aW9uLmxlZnRKb2luKGludGVybWVkaWF0ZVJlc3VsdCwgb3RoZXJUYWJsZSwgcHJlZGljYXRlKTtcbiAgICAgICAgdmFyIGpvaW5lZCA9IHJlc3VsdC5maWx0ZXIoZnVuY3Rpb24gKHJvdykgeyByZXR1cm4gcm93LmhhcyhvdGhlclRhYmxlKTsgfSkubWFwKGZ1bmN0aW9uIChyb3cpIHsgcmV0dXJuIHJvdy50YWJsZShvdGhlclRhYmxlLnRhYmxlKTsgfSk7XG4gICAgICAgIHZhciBqb2luZWRTZXQgPSBuZXcgU2V0KGpvaW5lZCk7XG4gICAgICAgIG90aGVyVGFibGUudGFibGUuYWxsKCkuZm9yRWFjaChmdW5jdGlvbiAocm93KSB7XG4gICAgICAgICAgICBpZiAoIWpvaW5lZFNldC5oYXMocm93KSkge1xuICAgICAgICAgICAgICAgIHZhciB0YWJsZVJvd1JlZmVyZW5jZSA9IG5ldyBRdWVyeV8xLlRhYmxlUm93UmVmZXJlbmNlKCk7XG4gICAgICAgICAgICAgICAgdGFibGVSb3dSZWZlcmVuY2Uuc2V0KG90aGVyVGFibGUsIHJvdyk7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2godGFibGVSb3dSZWZlcmVuY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICAgIEpvaW5FeGVjdXRpb24uY3Jvc3NKb2luID0gZnVuY3Rpb24gKGludGVybWVkaWF0ZVJlc3VsdCwgb3RoZXJUYWJsZSwgcHJlZGljYXRlKSB7XG4gICAgICAgIHJldHVybiBKb2luRXhlY3V0aW9uLmlubmVySm9pbihpbnRlcm1lZGlhdGVSZXN1bHQsIG90aGVyVGFibGUsIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH0pO1xuICAgIH07XG4gICAgcmV0dXJuIEpvaW5FeGVjdXRpb247XG59KCkpO1xuZXhwb3J0cy5Kb2luRXhlY3V0aW9uID0gSm9pbkV4ZWN1dGlvbjtcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIEpvaW5UeXBlO1xuKGZ1bmN0aW9uIChKb2luVHlwZSkge1xuICAgIEpvaW5UeXBlW0pvaW5UeXBlW1wiTEVGVFwiXSA9IDBdID0gXCJMRUZUXCI7XG4gICAgSm9pblR5cGVbSm9pblR5cGVbXCJSSUdIVFwiXSA9IDFdID0gXCJSSUdIVFwiO1xuICAgIEpvaW5UeXBlW0pvaW5UeXBlW1wiSU5ORVJcIl0gPSAyXSA9IFwiSU5ORVJcIjtcbiAgICBKb2luVHlwZVtKb2luVHlwZVtcIkZVTExcIl0gPSAzXSA9IFwiRlVMTFwiO1xuICAgIEpvaW5UeXBlW0pvaW5UeXBlW1wiQ1JPU1NcIl0gPSA0XSA9IFwiQ1JPU1NcIjtcbn0pKEpvaW5UeXBlID0gZXhwb3J0cy5Kb2luVHlwZSB8fCAoZXhwb3J0cy5Kb2luVHlwZSA9IHt9KSk7XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBUYWJsZV8xID0gcmVxdWlyZShcIi4uL1RhYmxlXCIpO1xudmFyIEpvaW5FeGVjdXRpb25fMSA9IHJlcXVpcmUoXCIuL0pvaW5FeGVjdXRpb25cIik7XG52YXIgV2hlcmVFeGVjdXRpb25fMSA9IHJlcXVpcmUoXCIuL1doZXJlRXhlY3V0aW9uXCIpO1xudmFyIEpvaW5UeXBlXzEgPSByZXF1aXJlKFwiLi9Kb2luVHlwZVwiKTtcbnZhciBRdWVyeSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gUXVlcnkoKSB7XG4gICAgICAgIHRoaXMuZXhlY3V0aW9ucyA9IFtdO1xuICAgICAgICB0aGlzLnRhYmxlUmVmZXJlbmNlcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5zZWxlY3RvciA9IGZ1bmN0aW9uIChfKSB7IHJldHVybiBbXTsgfTtcbiAgICB9XG4gICAgUXVlcnkucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICB0aGlzLnNlbGVjdG9yID0gc2VsZWN0b3I7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgUXVlcnkucHJvdG90eXBlLmpvaW4gPSBmdW5jdGlvbiAodGFibGUsIHByZWRpY2F0ZSwgam9pblR5cGUpIHtcbiAgICAgICAgaWYgKHByZWRpY2F0ZSA9PT0gdm9pZCAwKSB7IHByZWRpY2F0ZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07IH1cbiAgICAgICAgaWYgKGpvaW5UeXBlID09PSB2b2lkIDApIHsgam9pblR5cGUgPSBKb2luVHlwZV8xLkpvaW5UeXBlLklOTkVSOyB9XG4gICAgICAgIHZhciBleGVjdXRpb24gPSBuZXcgSm9pbkV4ZWN1dGlvbl8xLkpvaW5FeGVjdXRpb24odGhpcy50YWJsZVRvVGFibGVTZWxlY3Rpb24odGFibGUpLCBwcmVkaWNhdGUsIGpvaW5UeXBlKTtcbiAgICAgICAgdGhpcy5leGVjdXRpb25zLnB1c2goZXhlY3V0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBRdWVyeS5wcm90b3R5cGUud2hlcmUgPSBmdW5jdGlvbiAocHJlZGljYXRlKSB7XG4gICAgICAgIHRoaXMuZXhlY3V0aW9ucy5wdXNoKG5ldyBXaGVyZUV4ZWN1dGlvbl8xLldoZXJlRXhlY3V0aW9uKHByZWRpY2F0ZSkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFF1ZXJ5LnByb3RvdHlwZS5saW1pdCA9IGZ1bmN0aW9uIChsaW1pdCkge1xuICAgICAgICB0aGlzLnRha2UgPSBsaW1pdDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBRdWVyeS5wcm90b3R5cGUub2Zmc2V0ID0gZnVuY3Rpb24gKG9mZnNldCkge1xuICAgICAgICB0aGlzLnNraXAgPSBvZmZzZXQ7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgUXVlcnkucHJvdG90eXBlLmZyb20gPSBmdW5jdGlvbiAodGFibGUpIHtcbiAgICAgICAgdGhpcy5hbmNob3JUYWJsZSA9IHRoaXMudGFibGVUb1RhYmxlU2VsZWN0aW9uKHRhYmxlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBRdWVyeS5wcm90b3R5cGUuZXhlY3V0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFuY2hvclRhYmxlID0gdGhpcy5hbmNob3JUYWJsZTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IGFuY2hvclRhYmxlLnRhYmxlLmFsbCgpLm1hcChmdW5jdGlvbiAocm93KSB7XG4gICAgICAgICAgICB2YXIgY29sdW1uID0gbmV3IFRhYmxlUm93UmVmZXJlbmNlKCk7XG4gICAgICAgICAgICBjb2x1bW4uc2V0KGFuY2hvclRhYmxlLCByb3cpO1xuICAgICAgICAgICAgcmV0dXJuIGNvbHVtbjtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZXhlY3V0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChleGVjdXRpb24pIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGV4ZWN1dGlvbi5leGVjdXRlKHJlc3VsdCk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodGhpcy5za2lwICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5zbGljZSh0aGlzLnNraXApO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnRha2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmVzdWx0Lmxlbmd0aCA9IHRoaXMudGFrZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0Lm1hcCh0aGlzLnNlbGVjdG9yKTtcbiAgICB9O1xuICAgIFF1ZXJ5LnByb3RvdHlwZS50YWJsZVRvVGFibGVTZWxlY3Rpb24gPSBmdW5jdGlvbiAodGFibGUpIHtcbiAgICAgICAgaWYgKHRhYmxlIGluc3RhbmNlb2YgVGFibGVfMS5UYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUYWJsZUFzKHRhYmxlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGFibGU7XG4gICAgfTtcbiAgICByZXR1cm4gUXVlcnk7XG59KCkpO1xuZXhwb3J0cy5RdWVyeSA9IFF1ZXJ5O1xudmFyIFRhYmxlQXMgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFRhYmxlQXModGFibGUsIGFzKSB7XG4gICAgICAgIGlmIChhcyA9PT0gdm9pZCAwKSB7IGFzID0gbnVsbDsgfVxuICAgICAgICB0aGlzLnRhYmxlID0gdGFibGU7XG4gICAgICAgIHRoaXMuYXMgPSBhcztcbiAgICB9XG4gICAgcmV0dXJuIFRhYmxlQXM7XG59KCkpO1xuZXhwb3J0cy5UYWJsZUFzID0gVGFibGVBcztcbnZhciBUYWJsZVJvd1JlZmVyZW5jZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVGFibGVSb3dSZWZlcmVuY2UoKSB7XG4gICAgICAgIHRoaXMudGFibGVSZWZlcmVuY2UgPSBuZXcgTWFwKCk7XG4gICAgfVxuICAgIFRhYmxlUm93UmVmZXJlbmNlLnByb3RvdHlwZS50YWJsZSA9IGZ1bmN0aW9uICh0YWJsZVJlZmVyZW5jZSkge1xuICAgICAgICByZXR1cm4gdGhpcy50YWJsZVJlZmVyZW5jZS5nZXQodGFibGVSZWZlcmVuY2UpO1xuICAgIH07XG4gICAgVGFibGVSb3dSZWZlcmVuY2UucHJvdG90eXBlLmNvbHVtbiA9IGZ1bmN0aW9uICh0YWJsZVJlZmVyZW5jZSwgY29sdW1uUmVhZGVyKSB7XG4gICAgICAgIGlmICh0aGlzLnRhYmxlUmVmZXJlbmNlLmhhcyh0YWJsZVJlZmVyZW5jZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBjb2x1bW5SZWFkZXIodGhpcy50YWJsZVJlZmVyZW5jZS5nZXQodGFibGVSZWZlcmVuY2UpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xuICAgIFRhYmxlUm93UmVmZXJlbmNlLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbiAodGFibGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGFibGVSZWZlcmVuY2UuaGFzKHRhYmxlLnRhYmxlKTtcbiAgICB9O1xuICAgIFRhYmxlUm93UmVmZXJlbmNlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAodGFibGUsIHJvdykge1xuICAgICAgICBpZiAodGFibGUuYXMpIHtcbiAgICAgICAgICAgIHRoaXMudGFibGVSZWZlcmVuY2Uuc2V0KHRhYmxlLmFzLCByb3cpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGFibGVSZWZlcmVuY2Uuc2V0KHRhYmxlLnRhYmxlLCByb3cpO1xuICAgIH07XG4gICAgVGFibGVSb3dSZWZlcmVuY2UucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0YWJsZVJvd1JlZmVyZW5jZSA9IG5ldyBUYWJsZVJvd1JlZmVyZW5jZTtcbiAgICAgICAgdGhpcy50YWJsZVJlZmVyZW5jZS5mb3JFYWNoKGZ1bmN0aW9uICh2LCBrKSB7IHJldHVybiB0YWJsZVJvd1JlZmVyZW5jZS50YWJsZVJlZmVyZW5jZS5zZXQoaywgdik7IH0pO1xuICAgICAgICByZXR1cm4gdGFibGVSb3dSZWZlcmVuY2U7XG4gICAgfTtcbiAgICBUYWJsZVJvd1JlZmVyZW5jZS5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMudGFibGVSZWZlcmVuY2UuY2xlYXIoKTtcbiAgICB9O1xuICAgIHJldHVybiBUYWJsZVJvd1JlZmVyZW5jZTtcbn0oKSk7XG5leHBvcnRzLlRhYmxlUm93UmVmZXJlbmNlID0gVGFibGVSb3dSZWZlcmVuY2U7XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBXaGVyZUV4ZWN1dGlvbiA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gV2hlcmVFeGVjdXRpb24ocHJlZGljYXRlKSB7XG4gICAgICAgIHRoaXMucHJlZGljYXRlID0gcHJlZGljYXRlO1xuICAgIH1cbiAgICBXaGVyZUV4ZWN1dGlvbi5wcm90b3R5cGUuZXhlY3V0ZSA9IGZ1bmN0aW9uIChpbnRlcm1lZGlhdGVSZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIGludGVybWVkaWF0ZVJlc3VsdC5maWx0ZXIodGhpcy5wcmVkaWNhdGUpO1xuICAgIH07XG4gICAgcmV0dXJuIFdoZXJlRXhlY3V0aW9uO1xufSgpKTtcbmV4cG9ydHMuV2hlcmVFeGVjdXRpb24gPSBXaGVyZUV4ZWN1dGlvbjtcbiJdfQ==
