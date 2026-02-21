const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(process.cwd(), 'fleetflow.db');

let db;

function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initializeDb();
    }
    return db;
}

function initializeDb() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'dispatcher' CHECK(role IN ('manager','dispatcher','safety_officer','analyst')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      model TEXT NOT NULL,
      license_plate TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Truck','Van','Bike')),
      max_capacity_kg REAL NOT NULL DEFAULT 0,
      odometer INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available','On Trip','In Shop','Retired')),
      region TEXT DEFAULT 'Default',
      acquisition_cost REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      license_number TEXT UNIQUE NOT NULL,
      license_category TEXT NOT NULL CHECK(license_category IN ('Truck','Van','Bike')),
      license_expiry DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'Off Duty' CHECK(status IN ('On Duty','Off Duty','On Trip','Suspended')),
      safety_score REAL DEFAULT 100.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      cargo_weight_kg REAL NOT NULL DEFAULT 0,
      cargo_description TEXT,
      status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Dispatched','Completed','Cancelled')),
      start_odometer INTEGER DEFAULT 0,
      end_odometer INTEGER,
      revenue REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      dispatched_at DATETIME,
      completed_at DATETIME,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (driver_id) REFERENCES drivers(id)
    );

    CREATE TABLE IF NOT EXISTS maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      service_type TEXT NOT NULL,
      description TEXT,
      cost REAL NOT NULL DEFAULT 0,
      service_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'In Progress' CHECK(status IN ('Scheduled','In Progress','Completed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      trip_id INTEGER,
      type TEXT NOT NULL DEFAULT 'Fuel' CHECK(type IN ('Fuel','Toll','Other')),
      liters REAL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      expense_date DATE NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (trip_id) REFERENCES trips(id)
    );
  `);

    // Seed demo data if empty
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount === 0) {
        seedData();
    }
}

function seedData() {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);

    // Users
    const insertUser = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)');
    insertUser.run('manager@fleetflow.com', hash, 'Fleet Manager', 'manager');
    insertUser.run('dispatcher@fleetflow.com', hash, 'John Dispatcher', 'dispatcher');
    insertUser.run('safety@fleetflow.com', hash, 'Safety Officer', 'safety_officer');
    insertUser.run('analyst@fleetflow.com', hash, 'Data Analyst', 'analyst');

    // Vehicles
    const insertVehicle = db.prepare('INSERT INTO vehicles (name, model, license_plate, type, max_capacity_kg, odometer, status, region, acquisition_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertVehicle.run('Truck-01', 'Volvo FH16', 'TRK-1001', 'Truck', 5000, 125000, 'Available', 'North', 85000);
    insertVehicle.run('Truck-02', 'Scania R500', 'TRK-1002', 'Truck', 4500, 98000, 'On Trip', 'South', 78000);
    insertVehicle.run('Van-01', 'Ford Transit', 'VAN-2001', 'Van', 1200, 45000, 'Available', 'East', 35000);
    insertVehicle.run('Van-02', 'Mercedes Sprinter', 'VAN-2002', 'Van', 1500, 62000, 'In Shop', 'West', 42000);
    insertVehicle.run('Van-03', 'Renault Master', 'VAN-2003', 'Van', 1300, 38000, 'Available', 'North', 38000);
    insertVehicle.run('Bike-01', 'Honda CB300', 'BKE-3001', 'Bike', 50, 12000, 'Available', 'East', 5000);
    insertVehicle.run('Bike-02', 'Yamaha FZ25', 'BKE-3002', 'Bike', 40, 8500, 'On Trip', 'South', 4500);
    insertVehicle.run('Truck-03', 'MAN TGX', 'TRK-1003', 'Truck', 6000, 210000, 'Retired', 'West', 92000);

    // Drivers
    const insertDriver = db.prepare('INSERT INTO drivers (name, email, phone, license_number, license_category, license_expiry, status, safety_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    insertDriver.run('Alex Rivera', 'alex@fleet.com', '555-0101', 'DL-VAN-001', 'Van', '2027-06-15', 'On Duty', 95);
    insertDriver.run('Maria Santos', 'maria@fleet.com', '555-0102', 'DL-TRK-002', 'Truck', '2026-12-01', 'On Trip', 88);
    insertDriver.run('James Chen', 'james@fleet.com', '555-0103', 'DL-TRK-003', 'Truck', '2025-03-10', 'Off Duty', 72);
    insertDriver.run('Sara Patel', 'sara@fleet.com', '555-0104', 'DL-VAN-004', 'Van', '2027-09-20', 'On Duty', 98);
    insertDriver.run('Mike Johnson', 'mike@fleet.com', '555-0105', 'DL-BKE-005', 'Bike', '2026-08-30', 'On Trip', 82);
    insertDriver.run('Lisa Wong', 'lisa@fleet.com', '555-0106', 'DL-VAN-006', 'Van', '2026-01-01', 'Suspended', 45);

    // Trips
    const insertTrip = db.prepare('INSERT INTO trips (vehicle_id, driver_id, origin, destination, cargo_weight_kg, cargo_description, status, start_odometer, end_odometer, revenue, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertTrip.run(2, 2, 'Mumbai', 'Delhi', 3800, 'Electronics', 'Dispatched', 98000, null, 15000, '2026-02-18', null);
    insertTrip.run(7, 5, 'Pune', 'Mumbai', 35, 'Documents', 'Dispatched', 8500, null, 1200, '2026-02-19', null);
    insertTrip.run(1, 1, 'Chennai', 'Bangalore', 4200, 'Textiles', 'Completed', 120000, 124500, 18000, '2026-02-10', '2026-02-12');
    insertTrip.run(3, 4, 'Hyderabad', 'Vizag', 800, 'Food Supplies', 'Completed', 42000, 43200, 8500, '2026-02-05', '2026-02-06');
    insertTrip.run(5, 1, 'Jaipur', 'Udaipur', 1100, 'Furniture', 'Draft', 38000, null, 9500, '2026-02-20', null);

    // Maintenance
    const insertMaint = db.prepare('INSERT INTO maintenance (vehicle_id, service_type, description, cost, service_date, status) VALUES (?, ?, ?, ?, ?, ?)');
    insertMaint.run(4, 'Oil Change', 'Regular oil change & filter replacement', 2500, '2026-02-18', 'In Progress');
    insertMaint.run(1, 'Tire Rotation', 'All 6 tires rotated and balanced', 4500, '2026-02-01', 'Completed');
    insertMaint.run(8, 'Engine Overhaul', 'Complete engine rebuild — end of life', 45000, '2026-01-15', 'Completed');
    insertMaint.run(3, 'Brake Inspection', 'Front and rear brake pads checked', 1200, '2026-02-25', 'Scheduled');

    // Expenses
    const insertExpense = db.prepare('INSERT INTO expenses (vehicle_id, trip_id, type, liters, cost, expense_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insertExpense.run(1, 3, 'Fuel', 180, 16200, '2026-02-11', 'Diesel fill-up en route');
    insertExpense.run(2, 1, 'Fuel', 220, 19800, '2026-02-18', 'Full tank before dispatch');
    insertExpense.run(3, 4, 'Fuel', 45, 4050, '2026-02-05', 'City driving fuel');
    insertExpense.run(7, 2, 'Fuel', 8, 800, '2026-02-19', 'Bike petrol');
    insertExpense.run(2, 1, 'Toll', 0, 1500, '2026-02-18', 'Highway toll Mumbai-Delhi');
    insertExpense.run(1, 3, 'Toll', 0, 800, '2026-02-11', 'Expressway toll');
}

module.exports = { getDb };
