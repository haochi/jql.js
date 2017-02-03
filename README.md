# JQL.js

## Install

### Node
```bash
npm install --save-dev jql.js
```

```javascript
const JQL = require('jql.js')
```

### Browser

Get the `dist/jql.js` file and include that in your HTML.

```html
<script src="jql.js"></script>
```

It is then available as `JQL`.

## Usage

```javascript
const state = new JQL.Table([
    { id: 1, name: 'new york' },
    { id: 3, name: 'california' },
    { id: 4, name: 'texas' }]);
const city = new JQL.Table([
    { id: 1, stateId: 3, name: 'san francisco' },
    { id: 2, stateId: 1, name: 'new york' },
    { id: 3, stateId: 3, name: 'san jose' }]);
const resident = new JQL.Table([
    { id: 1, cityId: 1, name: 'eve' },
    { id: 2, cityId: 1, name: 'alice' },
    { id: 3, cityId: 1, name: 'bob' }]);

const result = state.query()
                    .select(_ => [_.table('rs').name, _.table(city).name, _.table(state).name])
                    .join(city, _ => _.table(state).id === _.table(city).stateId)
                    .join(resident.as('rs'), _ => _.table(city).id === _.table('rs').cityId)
                    .offset(1)
                    .limit(2)
                    .execute()

const message = result.map(([name, city, state]) => `${name} lives in ${city}, ${state}`)
expect(message).toEqual([
    'alice lives in san francisco, california',
    'bob lives in san francisco, california' ]);
```

This is analogous to the following query:

```sql
SELECT rs.name, city.name, state.name
FROM state
JOIN city ON state.id == city.stateId
JOIN resident AS rs ON city.id == rs.cityId
OFFSET 1
LIMIT 2
```

You can use `Table#as(alias: string)` to create an alias for the table. It would be useful for performing self joins.

See more examples in `test/test.ts`.

### Join

JQL supports inner, left, right, full, and cross joins. You pass them into the `join` method, like so:

```javascript
state.query()
    .select(_ => [_.column(city, t => t.name), _.table(state).name])
    .join(city, _ => _.table(state).id === _.table(city).stateId, JQL.JoinType.LEFT)
    .execute()
```

This is analogous to the following query:

```sql
SELECT city.name, state.name
FROM state
LEFT JOIN city ON state.id == city.stateId
```

Note that it's using `_.column` instead of `_.table` above to get the city name.
This is because for non-inner joins, it's possible for that column to not contain any data,
so we use `_.column` to get the value by passing in a function to evaluate the value.
