const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');


const app = express();

//Create MySQL connection
const connection = mysql.createConnection({
    // host: 'localhost',
    // user: 'root',
    // password: '',
    // database: 'bakery_app'

    host: 'pro.freedb.tech',
    user: '	pandas',
    password: '	qjj3BGQTr7nf2R$',
    database: 'pandasdb'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});


//Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

//Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });


// Set EJS as the view engine
app.set('view engine', 'ejs');
//=========================================================================================
//=========================================================================================
//LOGIN PAGE
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Login routes
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const getUserQuery = 'SELECT * FROM users WHERE username = ?';
    connection.query(getUserQuery, [username], (error, results) => {
        if (error) {
            console.error('Error retrieving user:', error.message);
            return res.status(500).send('Error retrieving user');
        }
        if (results.length === 0) {
            return res.render('login', { error: 'User does not exist' });
        }
        const user = results[0];
        if (user.password !== password) {
            return res.render('login', { error: 'Incorrect password' });
        }
        req.session.user = { id: user.id, username: user.username, role: user.role };
        res.redirect('/products');
    });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return console.error(err);
        }
        res.redirect('/login');
    });
});

//=========================================================================================
//=========================================================================================
//PRODUCTS
//READ: Display all products
app.get('/products', (req, res) => {
    const sql = "SELECT * FROM products";
    connection.query(sql, (error, results) => {
        if (error) {
            console.log("Database error", error);
            return res.status(500).send("Database error");
        }
        res.render('products', { products: results });
    });
});


//CREATE: Add a new product
app.post('/addProduct', upload.single('image'), (req, res) => {
    const { name, description, price } = req.body;
    const image = req.file ? req.file.filename : null;
    const sql = "INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)";
    connection.query(sql, [name, description, price, image], (error) => {
        if (error) {
            console.log("Database error", error);
            return res.status(500).send("Database error");
        }
        res.redirect("/adminView");
    });
});

//READ: View all products (AdminView)
app.get('/adminView', (req, res) => {
    const sql = "SELECT * FROM products";
    connection.query(sql, (error, results) => {
        if (error) {
            console.log("Database error", error);
            return res.status(500).send("Database error");
        }
        res.render('adminView', { products: results });
    });
});

//READ: Edit product page
app.get('/editProduct/:id', (req, res) => {
    const productId = req.params.id;
    const sql = 'SELECT * FROM products WHERE productId = ?';
    connection.query(sql, [productId], (error, results) => {
        if (error) {
            console.error('Database error:', error.message);
            return res.status(500).send('Error retrieving product by ID');
        }
        if (results.length > 0) {
            res.render('editProduct', { product: results[0] });
        } else {
            res.status(404).send('Product not found');
        }
    });
});

//UPDATE: Update product
app.post('/editProduct/:id', upload.single('image'), (req, res) => {
    const productId = req.params.id;
    const { name, description, price } = req.body;
    let image = req.body.currentImage;
    if (req.file) {
        image = req.file.filename;
    }
    const sql = 'UPDATE products SET name = ?, description = ?, price = ?, image = ? WHERE productId = ?';
    connection.query(sql, [name, description, price, image, productId], (error) => {
        if (error) {
            console.error("Error updating product:", error);
            return res.status(500).send("Error updating product");
        } else {
            res.redirect('/adminView');
        }
    });
});

//DELETE: Delete product
app.get('/deleteProduct/:id', (req, res) => {
    const productId = req.params.id;
    const sql = 'DELETE FROM products WHERE productId = ?';
    connection.query(sql, [productId], (error) => {
        if (error) {
            console.error("Error deleting product:", error);
            return res.status(500).send("Error deleting product");
        } else {
            res.redirect('/adminView');
        }
    });
});


//=========================================================================================
//=========================================================================================
//CART
//CREATE: Add item to cart
app.get('/cart/add', (req, res) => {
    const productId = req.query.productId;
    if (!productId) {
        return res.status(400).send('Product ID is required');
    }
    const checkCartSql = 'SELECT * FROM cart WHERE productId = ?';
    connection.query(checkCartSql, [productId], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }
        if (result.length > 0) {
            const updateCartSql = 'UPDATE cart SET quantity = quantity + 1 WHERE productId = ?';
            connection.query(updateCartSql, [productId], (err) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send('Database error');
                }
                res.redirect('/products');
            });
        } else {
            const addCartSql = 'INSERT INTO cart (productId, quantity) VALUES (?, 1)';
            connection.query(addCartSql, [productId], (err) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send('Database error');
                }
                res.redirect('/products');
            });
        }
    });
});

//READ: Display cart
app.get('/cart', (req, res) => {
    const sql = `SELECT cart.cartId, cart.productId, cart.quantity, products.name, products.price
                 FROM cart
                 JOIN products ON cart.productId = products.productId`;
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).send('Database error');
        }
        let totalAmount = 0;
        results.forEach(item => {
            totalAmount += item.price * item.quantity;
        });
        res.render('cart', { cart: results, totalAmount });
    });
});

//UPDATE: Decrease quantity in cart
app.get('/cart/decrease', (req, res) => {
    const productId = req.query.productId;
    const decreaseQuantitySql = 'UPDATE cart SET quantity = quantity - 1 WHERE productId = ? AND quantity > 1';
    connection.query(decreaseQuantitySql, [productId], (err) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }
        res.redirect('/cart');
    });
});
//UPDATE: Increase quantity in cart
app.get('/cart/increase', (req, res) => {
    const productId = req.query.productId;
    const increaseQuantitySql = 'UPDATE cart SET quantity = quantity + 1 WHERE productId = ?';
    connection.query(increaseQuantitySql, [productId], (err) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }
        res.redirect('/cart');
    });
});

//DELETE: Remove item from cart
app.get('/cart/remove', (req, res) => {
    const productId = req.query.productId;
    const removeProductSql = 'DELETE FROM cart WHERE productId = ?';
    connection.query(removeProductSql, [productId], (err) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }
        res.redirect('/cart');
    });
});

// Routes for product management
app.get('/addProduct', (req, res) => {
    res.render('addProduct');
});
//=========================================================================================
//=========================================================================================
// Route to display product details and reviews
app.get('/reviews/:productId', (req, res) => {
    const productId = req.params.productId;

    const getProductSql = 'SELECT * FROM products WHERE productId = ?';
    const getReviewsSql = 'SELECT * FROM reviews WHERE productId = ?';

    connection.query(getProductSql, [productId], (productError, productResults) => {
        if (productError) {
            console.error('Database error:', productError);
            return res.status(500).send('Database error');
        }

        if (productResults.length === 0) {
            return res.status(404).send('Product not found');
        }

        connection.query(getReviewsSql, [productId], (reviewsError, reviewsResults) => {
            if (reviewsError) {
                console.error('Database error:', reviewsError);
                return res.status(500).send('Database error');
            }

            // Pass the product and reviews to the template
            res.render('reviews', {
                product: productResults[0],
                reviews: reviewsResults
            });
        });
    });
});

//CREATE: Route to add a review
app.post('/reviews/:productId/add', (req, res) => {
    const productId = req.params.productId;
    const { rating, reviewText } = req.body;

    const addReviewSql = 'INSERT INTO reviews (productId, rating, reviewText) VALUES (?, ?, ?)';

    connection.query(addReviewSql, [productId, rating, reviewText], (error, results) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).send('Database error');
        }

        res.redirect(`/reviews/${productId}`);
    });
});
//=========================================================================================
//=========================================================================================
//START THE SERVER
const port = 3007;
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});


