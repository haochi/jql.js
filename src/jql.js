var Table = (function () {
    function Table(rows) {
        this.rows = rows;
    }
    Table.prototype.query = function () {
        var query = new Query();
        query.from(this);
        return query;
    };
    Table.prototype.all = function () {
        return this.rows;
    };
    return Table;
}());
var JoinExecution = (function () {
    function JoinExecution(query, anchorTable, otherTable, condition) {
        this.query = query;
        this.anchorTable = anchorTable;
        this.otherTable = otherTable;
        this.condition = condition;
    }
    JoinExecution.prototype.execute = function (intermediateResult) {
        var _this = this;
        var result = [];
        intermediateResult.forEach(function (tableRow) {
            _this.otherTable.table.all().forEach(function (row) {
                var oldValue = tableRow.table(_this.otherTable.table);
                tableRow.set(_this.otherTable, row);
                if (_this.condition(tableRow)) {
                    result.push(tableRow);
                }
                else {
                    tableRow.set(_this.otherTable, oldValue);
                }
            });
        });
        return result;
    };
    return JoinExecution;
}());
var TableSelection = (function () {
    function TableSelection(table, as) {
        if (as === void 0) { as = null; }
        this.table = table;
        this.as = as;
    }
    return TableSelection;
}());
var TableRowReference = (function () {
    function TableRowReference() {
        this.tableReference = new Map();
    }
    TableRowReference.prototype.table = function (tableReference) {
        return this.tableReference.get(tableReference);
    };
    TableRowReference.prototype.set = function (table, row) {
        this.tableReference.set(table.as, row);
        this.tableReference.set(table.table, row);
    };
    return TableRowReference;
}());
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
    Query.prototype.join = function (table, condition) {
        var execution = new JoinExecution(this, this.anchorTable, this.tableToTableSelection(table), condition);
        this.executions.push(execution);
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
        return result.map(this.selector);
    };
    Query.prototype.tableToTableSelection = function (table) {
        if (table instanceof Table) {
            return new TableSelection(table, Symbol());
        }
        return table;
    };
    return Query;
}());
