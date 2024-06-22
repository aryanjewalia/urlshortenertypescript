"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require('express');
var shortid = require('short-id');
var mysql = require("mysql");
var app = express();
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
var db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'storage'
});
db.connect(function (err) {
    if (err) {
        console.log('Error in DB connection:', err);
        return;
    }
    console.log('Connection to DB successful');
});
function getlinks(req, res) {
    db.query('SELECT * FROM `url`', function (err, results) {
        if (err) {
            console.log(err);
            return;
        }
        else {
            res.render('home', { results: results });
        }
    });
}
app.get('/', function (req, res) {
    getlinks(req, res);
});
app.post('/shortUrl', function (req, res) {
    var fullUrl = req.body.fullUrl;
    var customShortUrl = req.body.customshortUrl;
    if (!fullUrl) {
        return res.sendStatus(404);
    }
    if (customShortUrl && customShortUrl.length > 0) {
        db.query('SELECT * FROM `url` WHERE shortURL = ?', [customShortUrl], function (err, results) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Internal server error');
            }
            if (results.length > 0) {
                return res.status(400).send('Custom short URL already exists. Please choose another one.');
            }
            var url = { URL: fullUrl, shortURL: customShortUrl, counts: 1 };
            db.query('INSERT INTO `url` SET ?', url, function (err) {
                if (err) {
                    console.error('Error in inserting data:', err);
                    return res.status(500).send('Internal server error');
                }
                getlinks(req, res);
            });
        });
    }
    else {
        db.query('SELECT * FROM `url` WHERE `URL` = ?', [fullUrl], function (err, results) {
            if (err) {
                console.log(err);
                return res.sendStatus(404);
            }
            if (results.length === 0) {
                var short = shortid.generate();
                var url = { URL: fullUrl, shortURL: short, counts: 1 };
                db.query('INSERT INTO `url` SET ?', url, function (err) {
                    if (err) {
                        console.log('Error in inserting data:', err);
                        return;
                    }
                    getlinks(req, res);
                });
            }
            else {
                var _short = results[0].shortURL;
                var _counts = results[0].counts;
                db.query('UPDATE `url` SET `counts` = ? WHERE `shortURL` = ?', [_counts + 1, _short], function (err) {
                    if (err) {
                        console.log('Error in updating the table:', err);
                        return;
                    }
                    getlinks(req, res);
                });
            }
        });
    }
});
app.get('/:shortURL', function (req, res) {
    db.query('SELECT * FROM `url` WHERE `shortURL` = ?', [req.params.shortURL], function (err, results) {
        if (err) {
            console.log(err);
            return res.sendStatus(404);
        }
        if (results.length === 0) {
            return res.render('error');
        }
        else {
            res.redirect(results[0].URL);
        }
    });
});
app.listen(1001, function () {
    console.log('App is listening on port 1001');
});
