var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var jwt = require('jsonwebtoken');
var superSecret = 'toihocmean';
// Mongoose DB Configuration
const mongoose = require('mongoose');


var User = require('./app/models/user');
var port = 8080;


app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, authorization');
    next();
})

app.use(morgan('dev'));

mongoose.connect('mongodb://localhost:27017/users', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
mongoose.set('useCreateIndex', true);


app.get('/', function (req, res) {
    res.send('Welcome to the home page');
})

var apiRouter = express.Router();

apiRouter.post('/authenticate', function (req, res) {
        User.findOne({
            username: req.body.username
        }).select('name username password').exec(function (err, user) {
                if (err) throw err;
                if (!user) {
                    res.json({
                        success: false,
                        message: 'Authentication failed. User not found.'
                    });
                } else if (user) {
                    var validPassword = user.comparePassword(req.body.password);
                    if (!validPassword) {
                        res.json({
                            success: false,
                            message: 'Authentication failed. Wrong password'
                        });
                    } else {
                        var token = jwt.sign({
                                name: user.name,
                                username: user.username
                            },
                            superSecret, {
                                expiresIn: '24h'
                            });

                            // Return the information including token as JSON
                            res.json({
                                success: true,
                                message: 'Lam viec voi token',
                                token: token
                            });
                }
            }
        })
})

apiRouter.use(function (req, res, next) {
    console.log('Bao hieu API router co nguoi vao trang main!');
    next();
})

apiRouter.get('/', function (req, res) {
    res.json({
        message: 'Vi du dau tien ve API'
    });
})

apiRouter.route('/users')
    .post(function (req, res) {
    var user = new User();
    user.name = req.body.name;
    user.username = req.body.username;
    user.password = req.body.password;

    user.save(function (err) {
        if (err) {
            if (err.code === 11000)
                return res.json({
                    success: false,
                    message: 'A user with that username already exists'
                });
        } else
            return res.send(err);
    })

    res.json({
        message: 'User created'
    });

})
.get(function (req, res) {
    User.find(function (err, users) {
        if (err) return res.send(err);
        res.json(users);
    })
});



apiRouter.route('/users/:user_id').get(function (req, res) {
    User.findById(req.params.user_id, function (err, user) {
        if (err) return res.send(err);
        res.json(user)
    })
})
.put(function (req, res) {
    User.findById(req.params.user_id, function (err, user) {
        if (err) return res.send(err);
        if (req.body.name) user.name = req.body.name;
        if (req.body.username) user.username = req.body.username;
        if (req.body.password) user.password = req.body.password;

        user.save(function (err) {
            if (err) return res.send(err);
            res.json({
                message: 'User updated!'
            });
        })
    })
})

.delete(function (req, res) {
    User.remove({
        _id: req.params.user_id
    }, function (err, user) {
        if (err) return res.send(err);
        res.json({
            message: 'Successfully removed'
        });
    });
});



apiRouter.use(function(req, res, next) {
    console.log("Dang lam tren app");

    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    if(token) {
        jwt.verify(token, superSecret, function(err, decoded) {
            if(err) {
                return res.json({success: false, message: 'Failed to authenticate token!'});
            }
            else {
                req.decoded = decoded;
                next();
            }
        });
    } else {
        return res.status(403).send({
            success: false,
            message: 'No token provided'});
    }
});



app.use('/api', apiRouter);

app.listen(port);
console.log('Server listening on port ' + port);
