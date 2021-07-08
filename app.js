const express = require('express');
const app = express()
var paypal = require('paypal-rest-sdk');
const util = require('./util')
var easyinvoice = require('easyinvoice');
const donate = require('./Router/donateRoutes')
var fs = require('fs');

app.use(express.json());

app.set('view engine', 'ejs');
app.use(express.static('public'));
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));


app.get('/', (req, res) => res.render('index'));
app.use('/donate',donate) 

app.listen(3000, () => { console.log('listening to server'); })