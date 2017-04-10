/**
 * Created by ctalmacel on 12/21/15.
 */

var mysql = require('mysql');
var Q = require('q');
var modelUtil = require("../../lib/ModelDescription.js");

exports.createTable= function(persistenceStrategy,tableName,model){
    var query = 'CREATE TABLE IF NOT EXISTS '+tableName+'(';
    for(field in model){
        query+=field+' ';
        var type = model[field].type;
        var dbType = persistenceStrategy.getDatabaseType(type);
        if(dbType === 'varchar'){
            if(model[field]['length']){
                dbType += '('+model[field]['length']+') ';
            }else {
                dbType += '(30) ';
            }
        }

        if(dbType === 'int'){
            if(model[field]['length']){
                dbType += '('+model[field]['length']+') ';
            }else {
                dbType += '(10) ';
            }
        }
        query+=dbType;
        if(field.hasOwnProperty('default')){
            query+=' DEFAULT'+field.default;
        }
        query+=',';
    }
    for(field in model) {
        if (model[field].pk === true) {
            query += ' PRIMARY KEY (' + field + '),';
        }
    }
        query = query.slice(0,-1);
    query+=');';
    return query;
};

exports.insertRow = function(tableName,serializedData){

    var model = modelUtil.getModel(tableName);

    var query="REPLACE INTO "+tableName+" (";
    for (field in serializedData){
        query += field + ",";
    }
    query = query.slice(0, -1);
    query += ") VALUES (";



    for(var field in serializedData){
        query+= mysql.escape(serializedData[field])+',';
    }
    query = query.slice(0, -1);
    query+=');';
    return query;
};

exports.insertDataIntoTable = function(mysqlConnection,persistence,tableName,serializedData){
    var result = [];
    var runQuery = Q.nbind(mysqlConnection.query,mysqlConnection);
    serializedData.forEach(function(row,index){
        result.push(runQuery(exports.insertRow(mysqlConnection,persistence,tableName,row)));
    });
    return Q.all(result);
};

exports.createAndPopulateNewTable = function(mysqlConnection,persistence,tableName,model,serializedData){
    return exports.createNewTable(mysqlConnection,persistence,tableName,model).
    then(function(){return exports.insertDataIntoTable(mysqlConnection,persistence,tableName,serializedData,model)}).
    catch(function(err){console.log(err.stack);});
};

exports.createNewTable = function(mysqlConnection,persistence,tableName,model){
    return exports.dropTable(mysqlConnection,tableName).
    then(function(){return exports.createTable(mysqlConnection,persistence,tableName,model)}).
    catch(function(err){console.log(err.stack);});
};

exports.dropTable =function(tableName){
    return "DROP TABLE IF EXISTS " +tableName+";";
};

exports.deleteObject = function(typeName,serialized_id){
    return "DELETE from "+typeName+ " WHERE "+modelUtil.getPKField(typeName)+" = "+mysql.escape(serialized_id)+";";
}

exports.describeTable = function(typeName){
    return "DESCRIBE "+typeName;
}

exports.find = function(typeName,pkField,serializedPk){
    var query = 'SELECT * from ' + typeName + ' WHERE ' + pkField + " = " + mysql.escape(serializedPk)+";";
    return query
}

exports.update = function(typeName,pkField,serialisedPk,fields,values){
    var model = modelUtil.getModel(typeName);

    var query = 'UPDATE '+typeName+ " SET ";
    var length = fields.length;
    fields.forEach(function(field,index) {
            query += field+"=" +mysql.escape(values[index])+",";
        
    });
    query = query.slice(0,-1);
    query+="WHERE "+pkField+"="+mysql.escape(serialisedPk)+";";

    return query;
}

exports.filter = function(typeName,filter){
    var query = "SELECT * from "+typeName+" ";
    var model = modelUtil.getModel(typeName);

    if(filter == undefined){
        return query+";";
    }
    query +="WHERE ";
    for(var field in filter){
        query += field + "="+mysql.escape(filter[field])+" AND ";
    }

    query = query.slice(0,-4);
    query+=";";
    return query;
}