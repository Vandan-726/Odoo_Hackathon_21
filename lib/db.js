const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

let initialized = false;

async function initializeDb() {
  if (initialized) return;

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error('\n❌ PostgreSQL Connection Failed!');
    console.error('   Error:', err.message);
    console.error('   DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') || 'NOT SET');
    console.error('\n   Make sure:');
    console.error('   1. PostgreSQL is running');
    console.error('   2. DATABASE_URL in .env.local has the correct password');
    console.error('   3. The database "fleetflow" exists (run: CREATE DATABASE fleetflow;)\n');
    throw err;
  }
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'dispatcher' CHECK(role IN ('manager','dispatcher','safety_officer','analyst')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        model TEXT NOT NULL,
        license_plate TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('Truck','Van','Bike')),
        max_capacity_kg REAL NOT NULL DEFAULT 0,
        odometer INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available','On Trip','In Shop','Retired')),
        region TEXT DEFAULT 'Default',
        acquisition_cost REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        license_number TEXT UNIQUE NOT NULL,
        license_category TEXT NOT NULL CHECK(license_category IN ('Truck','Van','Bike')),
        license_expiry DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'Off Duty' CHECK(status IN ('On Duty','Off Duty','On Trip','Suspended')),
        safety_score REAL DEFAULT 100.0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS trips (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
        driver_id INTEGER NOT NULL REFERENCES drivers(id),
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        cargo_weight_kg REAL NOT NULL DEFAULT 0,
        cargo_description TEXT,
        status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Dispatched','Completed','Cancelled')),
        start_odometer INTEGER DEFAULT 0,
        end_odometer INTEGER,
        revenue REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        dispatched_at TIMESTAMP,
        completed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS maintenance (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
        service_type TEXT NOT NULL,
        description TEXT,
        cost REAL NOT NULL DEFAULT 0,
        service_date DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'In Progress' CHECK(status IN ('Scheduled','In Progress','Completed')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
        trip_id INTEGER REFERENCES trips(id),
        type TEXT NOT NULL DEFAULT 'Fuel' CHECK(type IN ('Fuel','Toll','Other')),
        liters REAL DEFAULT 0,
        cost REAL NOT NULL DEFAULT 0,
        expense_date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed demo data if empty
    const res = await client.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(res.rows[0].count) === 0) {
      await seedData(client);
    }

    initialized = true;
  } finally {
    client.release();
  }
}

async function seedData(client) {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('admin123', salt);

  // Users
  await client.query(
    'INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,$4),($5,$6,$7,$8),($9,$10,$11,$12),($13,$14,$15,$16)',
    [
      'manager@fleetflow.com', hash, 'Fleet Manager', 'manager',
      'dispatcher@fleetflow.com', hash, 'John Dispatcher', 'dispatcher',
      'safety@fleetflow.com', hash, 'Safety Officer', 'safety_officer',
      'analyst@fleetflow.com', hash, 'Data Analyst', 'analyst',
    ]
  );

  // Vehicles
  await client.query(`
    INSERT INTO vehicles (name, model, license_plate, type, max_capacity_kg, odometer, status, region, acquisition_cost) VALUES
    ('Truck-01','Volvo FH16','TRK-1001','Truck',5000,125000,'Available','North',85000),
    ('Truck-02','Scania R500','TRK-1002','Truck',4500,98000,'On Trip','South',78000),
    ('Van-01','Ford Transit','VAN-2001','Van',1200,45000,'Available','East',35000),
    ('Van-02','Mercedes Sprinter','VAN-2002','Van',1500,62000,'In Shop','West',42000),
    ('Van-03','Renault Master','VAN-2003','Van',1300,38000,'Available','North',38000),
    ('Bike-01','Honda CB300','BKE-3001','Bike',50,12000,'Available','East',5000),
    ('Bike-02','Yamaha FZ25','BKE-3002','Bike',40,8500,'On Trip','South',4500),
    ('Truck-03','MAN TGX','TRK-1003','Truck',6000,210000,'Retired','West',92000)
  `);

  // Drivers
  await client.query(`
    INSERT INTO drivers (name, email, phone, license_number, license_category, license_expiry, status, safety_score) VALUES
    ('Alex Rivera','alex@fleet.com','555-0101','DL-VAN-001','Van','2027-06-15','On Duty',95),
    ('Maria Santos','maria@fleet.com','555-0102','DL-TRK-002','Truck','2026-12-01','On Trip',88),
    ('James Chen','james@fleet.com','555-0103','DL-TRK-003','Truck','2025-03-10','Off Duty',72),
    ('Sara Patel','sara@fleet.com','555-0104','DL-VAN-004','Van','2027-09-20','On Duty',98),
    ('Mike Johnson','mike@fleet.com','555-0105','DL-BKE-005','Bike','2026-08-30','On Trip',82),
    ('Lisa Wong','lisa@fleet.com','555-0106','DL-VAN-006','Van','2026-01-01','Suspended',45)
  `);

  // Trips
  await client.query(`
    INSERT INTO trips (vehicle_id, driver_id, origin, destination, cargo_weight_kg, cargo_description, status, start_odometer, end_odometer, revenue, created_at, completed_at) VALUES
    (2,2,'Mumbai','Delhi',3800,'Electronics','Dispatched',98000,NULL,15000,'2026-02-18',NULL),
    (7,5,'Pune','Mumbai',35,'Documents','Dispatched',8500,NULL,1200,'2026-02-19',NULL),
    (1,1,'Chennai','Bangalore',4200,'Textiles','Completed',120000,124500,18000,'2026-02-10','2026-02-12'),
    (3,4,'Hyderabad','Vizag',800,'Food Supplies','Completed',42000,43200,8500,'2026-02-05','2026-02-06'),
    (5,1,'Jaipur','Udaipur',1100,'Furniture','Draft',38000,NULL,9500,'2026-02-20',NULL)
  `);

  // Maintenance
  await client.query(`
    INSERT INTO maintenance (vehicle_id, service_type, description, cost, service_date, status) VALUES
    (4,'Oil Change','Regular oil change & filter replacement',2500,'2026-02-18','In Progress'),
    (1,'Tire Rotation','All 6 tires rotated and balanced',4500,'2026-02-01','Completed'),
    (8,'Engine Overhaul','Complete engine rebuild — end of life',45000,'2026-01-15','Completed'),
    (3,'Brake Inspection','Front and rear brake pads checked',1200,'2026-02-25','Scheduled')
  `);

  // Expenses
  await client.query(`
    INSERT INTO expenses (vehicle_id, trip_id, type, liters, cost, expense_date, notes) VALUES
    (1,3,'Fuel',180,16200,'2026-02-11','Diesel fill-up en route'),
    (2,1,'Fuel',220,19800,'2026-02-18','Full tank before dispatch'),
    (3,4,'Fuel',45,4050,'2026-02-05','City driving fuel'),
    (7,2,'Fuel',8,800,'2026-02-19','Bike petrol'),
    (2,1,'Toll',0,1500,'2026-02-18','Highway toll Mumbai-Delhi'),
    (1,3,'Toll',0,800,'2026-02-11','Expressway toll')
  `);
}

async function getDb() {
  await initializeDb();
  return pool;
}

module.exports = { getDb };
