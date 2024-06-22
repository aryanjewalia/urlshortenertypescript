import { Request, Response } from 'express';
const express = require('express');
const shortid = require('shortid');
import * as mysql from 'mysql';
import { Connection, MysqlError } from 'mysql';

const app = express();

app.use(express.urlencoded({ extended: false }));

app.set('view engine', 'ejs');

const db: Connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'storage'
});

db.connect((err: MysqlError | null) => {
    if (err) {
        console.log('Error in DB connection:', err);
        return;
    }
    console.log('Connection to DB successful');
});

interface UrlRecord {
    URL: string;
    shortURL: string;
    counts: number;
}

function getlinks(req: Request, res: Response): void {
    db.query('SELECT * FROM `url`', (err: MysqlError | null, results: UrlRecord[]) => {
        if (err) {
            console.log(err);
            return;
        } else {
            res.render('home', { results });
        }
    });
}

app.get('/', (req: Request, res: Response) => {
    getlinks(req, res);
});

app.post('/shortUrl', (req: Request, res: Response) => {
    const fullUrl: string = req.body.fullUrl;
    const customShortUrl: string = req.body.customshortUrl;

    if (!fullUrl) {
        return res.sendStatus(404);
    }

    if (customShortUrl && customShortUrl.length > 0) {
        db.query('SELECT * FROM `url` WHERE shortURL = ?', [customShortUrl], (err: MysqlError | null, results: UrlRecord[]) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Internal server error');
            }

            if (results.length > 0) {
                return res.status(400).send('Custom short URL already exists. Please choose another one.');
            }

            const url: UrlRecord = { URL: fullUrl, shortURL: customShortUrl, counts: 1 };

            db.query('INSERT INTO `url` SET ?', url, (err: MysqlError | null) => {
                if (err) {
                    console.error('Error in inserting data:', err);
                    return res.status(500).send('Internal server error');
                }

                getlinks(req, res);
            });
        });
    } else {
        db.query('SELECT * FROM `url` WHERE `URL` = ?', [fullUrl], (err: MysqlError | null, results: UrlRecord[]) => {
            if (err) {
                console.log(err);
                return res.sendStatus(404);
            }

            if (results.length === 0) {
                const short = shortid.generate();
                const url: UrlRecord = { URL: fullUrl, shortURL: short, counts: 1 };

                db.query('INSERT INTO `url` SET ?', url, (err: MysqlError | null) => {
                    if (err) {
                        console.log('Error in inserting data:', err);
                        return;
                    }
                    getlinks(req, res);
                });
            } else {
                const _short = results[0].shortURL;
                const _counts = results[0].counts;

                db.query('UPDATE `url` SET `counts` = ? WHERE `shortURL` = ?', [_counts + 1, _short], (err: MysqlError | null) => {
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

app.get('/:shortURL', (req: Request, res: Response) => {
    db.query('SELECT * FROM `url` WHERE `shortURL` = ?', [req.params.shortURL], (err: MysqlError | null, results: UrlRecord[]) => {
        if (err) {
            console.log(err);
            return res.sendStatus(404);
        }

        if (results.length === 0) {
            return res.render('error');
        } else {
            res.redirect(results[0].URL);
        }
    });
});

app.listen(1001, () => {
    console.log('App is listening on port 1001');
});
