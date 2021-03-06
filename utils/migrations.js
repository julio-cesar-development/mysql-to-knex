String.prototype.addEndLine = function() {
  return `${this.valueOf()}\n`;
}

String.prototype.addCaracters = function(caracteres = '') {
  return `${this.valueOf()}${caracteres}`;
};

const addClosing = (knex_data = '') => {
  knex_data = knex_data
    .addEndLine()
    .addCaracters('}');
  return knex_data;
}

const addTopConstructor = (table_name, structure_type, knex_data = '') => {
  knex_data = knex_data
    .addCaracters('exports.up = function(knex, Promise) {')
    .addEndLine()
    .addCaracters('  ')

  if (structure_type === 'table') {
    knex_data = knex_data
      .addCaracters(`return knex.schema.createTable('${table_name}', (table) => {`)
      .addEndLine();
  } else if (structure_type === 'view') {
    knex_data = knex_data
      .addCaracters(`return knex.raw("CREATE OR REPLACE VIEW `);
  }

  return knex_data;
}

const addBottomConstructor = (table_view_name, structure_type, knex_data = '') => {
  knex_data = addClosing();
    knex_data = knex_data
      .addEndLine()
      .addEndLine()
      .addCaracters('exports.down = function(knex, Promise) {')
      .addEndLine()
      .addCaracters('  ');

  if (structure_type === 'table') {
    knex_data = knex_data
      .addCaracters(`return knex.schema.dropTable('${table_view_name}');`);

  } else if (structure_type === 'view') {
    knex_data = knex_data
      .addCaracters(`return knex.raw("DROP VIEW ${table_view_name}");`);
  }

  knex_data = knex_data
    .addEndLine()
    .addCaracters('}')
    .addEndLine();

  return knex_data;
}

/**
 * Return default and nullable options for the given column
 *
 * @param {string} column_default
 * @param {string} is_nullable
 * @param {string} [knex_data = '']
 * @returns {string} knex_data
 */
const checkDefaultAndNullable = (column_default, is_nullable, knex_data = '') => {
  if (column_default) {
    if (column_default === 'CURRENT_TIMESTAMP') {
      knex_data += `.defaultTo(knex.fn.now())`;
    } else {
      knex_data += `.defaultTo('${column_default}')`;
    }
  }
  if (is_nullable) {
    knex_data += is_nullable === 'YES' ? '.nullable()' : '.notNullable()';
  }
  return knex_data;
}

/**
 * Fill the knex_data for regular types with the given params
 *
 * @param {string} str_data
 * @param {boolean|string} [column_default = false]
 * @param {boolean|string} [is_nullable = false]
 * @param {string} [knex_data = '']
 * @returns {string} knex_data
 */
const fillRegularDataTypes = (str_data, column_default = false, is_nullable = false, knex_data = '') => {
  knex_data = knex_data.addCaracters('  ')
    .addCaracters('  ')
    .addCaracters(str_data);

  if (column_default || is_nullable) {
    knex_data += checkDefaultAndNullable(column_default, is_nullable);
  }
  knex_data = knex_data
    .addCaracters(';')
    .addEndLine();
  return knex_data;
}

/**
 * Fill the knex_data for indexes with the given params
 *
 * @param {string} str_data
 * @param {string} [knex_data = '']
 * @returns {string} knex_data
 */
const fillIndexData = (str_data,  knex_data = '') => {
  knex_data = knex_data.addCaracters('  ')
    .addCaracters('  ')
    .addCaracters(str_data)
    .addCaracters(';')
    .addEndLine();
  return knex_data;
}

/**
 * Map the regular types of data for the given column
 *
 * @param {string} column
 * @param {string} [knex_data = '']
 * @returns {string} knex_data
 */
const mapTypes = (column, knex_data = '') => {
  if (column.EXTRA) {
    // auto_increment
    if (column.EXTRA === 'auto_increment') {
      knex_data += fillRegularDataTypes(`table.increments('${column.COLUMN_NAME}')`);
    }
    if (column.EXTRA === 'VIRTUAL GENERATED') {
      // TODO: Generated Columns
    }
  } else {
    if (column.DATA_TYPE) {
      switch (column.DATA_TYPE) {
        case 'varchar':
          knex_data += fillRegularDataTypes(`table.string('${column.COLUMN_NAME}', ${column.CHARACTER_MAXIMUM_LENGTH})`, column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'bigint':
          knex_data += fillRegularDataTypes(`table.bigint('${column.COLUMN_NAME}')`, column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'longtext':
          knex_data += fillRegularDataTypes(`table.text('${column.COLUMN_NAME}', 'longtext')`, column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'datetime':
          knex_data += fillRegularDataTypes(`table.datetime('${column.COLUMN_NAME}')`, column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'int':
          knex_data += fillRegularDataTypes(`table.integer('${column.COLUMN_NAME}', ${column.COLUMN_TYPE.replace(/.*\(([0-9]+)\).*/gi, '$1').replace(/,/, '.')})`,
            column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'tinyint':
          // There is no support for tinyint in Knex, setting as integer
          knex_data += fillRegularDataTypes(`table.integer('${column.COLUMN_NAME}', ${column.COLUMN_TYPE.replace(/.*\(([0-9]+)\).*/gi, '$1').replace(/,/, '.')})`,
            column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'decimal':
          knex_data += fillRegularDataTypes(`table.decimal('${column.COLUMN_NAME}', ${column.COLUMN_TYPE.replace(/.*\(([0-9]+(,?\.?[0-9]+)?)\)/gi, '$1').replace(/,/, '.')})`,
            column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'double':
          // There is no support for double in Knex, setting as float
          knex_data += fillRegularDataTypes(`table.float('${column.COLUMN_NAME}', ${column.NUMERIC_PRECISION})`, column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'text':
          knex_data += fillRegularDataTypes(`table.text('${column.COLUMN_NAME}')`, column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'json':
          knex_data += fillRegularDataTypes(`table.json('${column.COLUMN_NAME}')`, column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'float':
          knex_data += fillRegularDataTypes(`table.float('${column.COLUMN_NAME}', ${column.NUMERIC_PRECISION})`, column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'mediumtext':
          knex_data += fillRegularDataTypes(`table.text('${column.COLUMN_NAME}', 'mediumtext')`, column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'enum':
          knex_data += fillRegularDataTypes(`table.enu('${column.COLUMN_NAME}', [${column.COLUMN_TYPE.replace(/enum\((.*)\)/, '$1')}])`,
            column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'char':
          knex_data += fillRegularDataTypes(`table.string('${column.COLUMN_NAME}', '${column.CHARACTER_MAXIMUM_LENGTH}')`,
            column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'binary':
          // Binary is changed to blob that doesn't support default values in Knex, so we will use integer with short length for now
          knex_data += fillRegularDataTypes(`table.integer('${column.COLUMN_NAME}', 1)`, column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'date':
          knex_data += fillRegularDataTypes(`table.date('${column.COLUMN_NAME}')`, column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'time':
          knex_data += fillRegularDataTypes(`table.time('${column.COLUMN_NAME}')`, column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'timestamp':
          knex_data += fillRegularDataTypes(`table.timestamp('${column.COLUMN_NAME}')`, column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
        case 'smallint':
          // There is no support for smallint in Knex, setting as integer
          knex_data += fillRegularDataTypes(`table.integer('${column.COLUMN_NAME}', ${column.COLUMN_TYPE.replace(/.*\(([0-9]+)\).*/gi, '$1').replace(/,/, '.')})`,
            column.COLUMN_DEFAULT, column.IS_NULLABLE);
        break;
      }
    }
  }
  return knex_data;
}

/**
 * Map the indexes for the given column
 *
 * @param {string} column
 * @param {boolean} contains_pK
 * @param {string} [knex_data = '']
 * @returns {string} knex_data
 */
const mapIndexes = (column, contains_pK, knex_data = '') => {
  knex_data = mapTypes(column, knex_data);
  if (!column.EXTRA) {
    // Primary key
    if (column.COLUMN_KEY === 'PRI') {
      if (!contains_pK) {
        // One primary key
        knex_data += fillIndexData(`table.primary('${column.COLUMN_NAME}');`);
      } else {
        // Multiple primary keys
        let keys = knex_data.match(/.*table\.primary\(\[(.*)\]\);.*/gim);
        // It already has more than one key
        if (keys) {
          knex_data = knex_data.replace(/table\.primary\(\[(.*)\]\);/gim, `table.primary([$1, '${column.COLUMN_NAME}'])`);
        } else{
          knex_data = knex_data.replace(/table\.primary\((.*)\);/gim, `table.primary([$1, '${column.COLUMN_NAME}'])`);
        }
      }
    }
    // Unique
    if (column.COLUMN_KEY === 'UNI') {
      knex_data += fillIndexData(`table.unique('${column.COLUMN_NAME}')`);
    }
    // Multiple index
    if (column.COLUMN_KEY === 'MUL') {
      knex_data += fillIndexData(`table.index('${column.COLUMN_NAME}', '${column.COLUMN_NAME}_index')`);
    }
  }
  return knex_data;
}

/**
 * Generate instructions to add auto generated columns
 *
 * @param {string} column
 * @param {string} table_info
 * @param {string} table_name
 * @returns {string} knex_data
 */
const mapAutoGeneratedColumns = (column, table_info, table_name, knex_data_raw = '') => {
  const re_column = new RegExp(`\`${column.COLUMN_NAME}\`.*GENERATED.*,`, 'gim');
  const column_match = table_info.match(re_column);

  if (column_match) {

    const re_generated = new RegExp('.*GENERATED.*');
    const match_generated = column_match.toString().match(re_generated);
    if (match_generated) {
      const column_type = match_generated.toString().replace(new RegExp(`\`${column.COLUMN_NAME}\`\\s(.*)\\sGENERATED.*`, 'gim'), '$1');

      let column_desc = match_generated.toString().replace(new RegExp(`\`${column.COLUMN_NAME}\`.*GENERATED\\s`, 'gim'), '');
      column_desc = column_desc.substring(0, column_desc.length - 1); // Removes the comma in the end of string
      column_desc = column_desc.replace(/\"/gim, '\\"'); // Escape double quotes

      knex_data_raw = knex_data_raw.addCaracters('  ');
      knex_data_raw += `.raw("ALTER TABLE \`${table_name}\` ADD COLUMN \`${column.COLUMN_NAME}\` ${column_type} GENERATED ${column_desc}")`;
    }
  }
  return knex_data_raw;
}

/**
 * Handle foreign keys
 *
 * @param {string} constraint_match
 * @param {string} table_name
 */
const handleKFs = (constraint_match, table_name) => {
  let knex_data_raw = '';

  if (constraint_match) {
    knex_data_raw = knex_data_raw
      .addCaracters('exports.up = function(knex, Promise) {')
      .addCaracters('  ')
      .addEndLine();

    constraint_match = constraint_match.toString();
    const re_constraint = new RegExp(`CONSTRAINT \`(.*)\` FOREIGN KEY \(\`?(.*)\`?\) REFERENCES \`(.*)\` \(\`?(.*)\`?\).*[,|\n]`, 'gim');

    const constraint_name = constraint_match.replace(re_constraint, '$1').toString().replace(/\`|\(|\)|\n/gi, '');
    const constraint_column = constraint_match.replace(re_constraint, '$2').toString().replace(/\`|\(|\)|\n/gi, '');
    const constraint_ref_table = constraint_match.replace(re_constraint, '$4').toString().replace(/\`|\(|\)|\n/gi, '');
    const constraint_ref_column = constraint_match.replace(re_constraint, '$3').toString().replace(/\`|\(|\)|\n/gi, '');

    knex_data_raw = knex_data_raw.addCaracters('  ');
    knex_data_raw += `return knex.raw("ALTER TABLE \`${table_name}\` ADD CONSTRAINT \`${constraint_name}\` FOREIGN KEY(\`${constraint_column}\`) REFERENCES \`${constraint_ref_table}\` (\`${constraint_ref_column}\`)");`;

    knex_data_raw = knex_data_raw
      .addEndLine()
      .addCaracters('}')
      .addEndLine();

    knex_data_raw += 'exports.down = function(knex, Promise) {';
    knex_data_raw = knex_data_raw.addEndLine().addCaracters('  ');
    knex_data_raw += `return knew.raw("ALTER TABLE \`${table_name}\` DROP FOREIGN KEY \`${constraint_name}\`")`;
    knex_data_raw = knex_data_raw.addEndLine().addCaracters('}');
  }

  return knex_data_raw;
}

/**
 * Generate tables data to be written in the files
 *
 * @param {string} table_definition
 * @param {string} table_name
 * @param {string} table_info
 * @returns {string} knex_data
 */
const generateTableMigration = (table_definition, table_name, table_info) => {
  return new Promise((resolve, reject) => {
    let knex_data_raw = '';
    let knex_data = addTopConstructor(table_name, 'table');
    let contains_pK = false;
    const columns_match = [];

    // Iterating columns
    table_definition.forEach((column, index) => {
      if (column.COLUMN_KEY) {
        // Handle indexed columns
        knex_data = mapIndexes(column, contains_pK, knex_data);
        contains_pK = true;
      } else {
        // Handle NOT indexed columns
        knex_data = mapTypes(column, knex_data);
      }
      const row = mapAutoGeneratedColumns(column, table_info, table_name );
      if (row) {
        columns_match.push({ index, row })
      }
    });

    knex_data = knex_data
      .addCaracters('  ')
      .addCaracters('})');

    if (columns_match && columns_match.length) {
      knex_data = knex_data.addEndLine();
      knex_data_raw = columns_match.map(({ row }) => row).join('\n').addCaracters(';')
      knex_data += knex_data_raw;
    } else {
      knex_data = knex_data.addCaracters(';');
    }

    knex_data += addBottomConstructor(table_name, 'table');

    resolve(knex_data);
  })
}

/**
 * Generate FK data to be written in the files
 *
 * @param {string} table_name
 * @param {string} table_info
 * @returns {string} knex_data_fks
 */
const generateFKs = (table_name, table_info) => {
  return new Promise((resolve, reject) => {
    const re_constraints = new RegExp(`CONSTRAINT \`.*\` FOREIGN KEY \(\`?(.*)\`?\) REFERENCES \`(.*)\` \(\`?(.*)\`?\)[,|\n]`, 'gim');
    const constraint_match = table_info.match(re_constraints);

    knex_data_fks = handleKFs(constraint_match, table_name);

    resolve(knex_data_fks);
  })
}

/**
 * Generate views data to be written in the files
 *
 * @param {string} view_definition
 * @param {string} view_name
 * @returns {string} knex_data
 */
const generateViewMigration = (view_definition, view_name) => {
  return new Promise((resolve, reject) => {
    let knex_data = addTopConstructor(view_name, 'view');

    view_definition = view_definition.replace(/\"/gim, '\\"');

    knex_data += view_definition;
    knex_data = knex_data.addCaracters('");');
    knex_data += addBottomConstructor(view_name, 'view');

    resolve(knex_data);
  })
}

module.exports = {
  generateTableMigration,
  generateFKs,
  generateViewMigration,
};
