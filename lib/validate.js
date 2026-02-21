/**
 * validate.js — Centralized input validation utility
 * 
 * WHY THIS FILE EXISTS:
 *   Instead of writing validation logic inside every API route,
 *   we keep all rules in one file. This makes the code:
 *     1. DRY (Don't Repeat Yourself)
 *     2. Easy to test
 *     3. Consistent across all API endpoints
 * 
 * HOW IT WORKS:
 *   Each function takes user input, checks it against rules,
 *   and returns { valid: true } or { valid: false, error: '...' }
 */

// ---- GENERIC HELPERS ---- //

function isNonEmptyString(val) {
    return typeof val === 'string' && val.trim().length > 0;
}

function isPositiveNumber(val) {
    return typeof val === 'number' && !isNaN(val) && val > 0;
}

function isNonNegativeNumber(val) {
    return typeof val === 'number' && !isNaN(val) && val >= 0;
}

function isValidDate(val) {
    if (!val) return false;
    const d = new Date(val);
    return !isNaN(d.getTime());
}

function isValidEmail(val) {
    if (!val) return false;
    // Basic email regex — catches 99% of real emails
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

// ---- VEHICLE VALIDATION ---- //

function validateVehicle(body) {
    const { name, model, license_plate, type, max_capacity_kg, odometer, acquisition_cost } = body;

    if (!isNonEmptyString(name)) return { valid: false, error: 'Vehicle name is required' };
    if (name.length > 50) return { valid: false, error: 'Vehicle name must be under 50 characters' };

    if (!isNonEmptyString(model)) return { valid: false, error: 'Vehicle model is required' };
    if (model.length > 50) return { valid: false, error: 'Model must be under 50 characters' };

    if (!isNonEmptyString(license_plate)) return { valid: false, error: 'License plate is required' };
    if (!/^[A-Z0-9-]{3,15}$/i.test(license_plate.trim())) {
        return { valid: false, error: 'License plate must be 3-15 alphanumeric characters or dashes' };
    }

    if (!['Truck', 'Van', 'Bike'].includes(type)) {
        return { valid: false, error: 'Type must be Truck, Van, or Bike' };
    }

    if (max_capacity_kg !== undefined && max_capacity_kg !== null) {
        if (!isPositiveNumber(Number(max_capacity_kg))) return { valid: false, error: 'Max capacity must be a positive number' };
    }

    if (odometer !== undefined && odometer !== null) {
        if (!isNonNegativeNumber(Number(odometer))) return { valid: false, error: 'Odometer cannot be negative' };
    }

    if (acquisition_cost !== undefined && acquisition_cost !== null) {
        if (!isNonNegativeNumber(Number(acquisition_cost))) return { valid: false, error: 'Acquisition cost cannot be negative' };
    }

    return { valid: true };
}

// ---- DRIVER VALIDATION ---- //

function validateDriver(body) {
    const { name, email, phone, license_number, license_category, license_expiry, safety_score } = body;

    if (!isNonEmptyString(name)) return { valid: false, error: 'Driver name is required' };
    if (name.length > 60) return { valid: false, error: 'Name must be under 60 characters' };

    if (email && !isValidEmail(email)) return { valid: false, error: 'Invalid email format' };

    if (phone && !/^[\d\s\-+()]{5,20}$/.test(phone)) {
        return { valid: false, error: 'Phone must be 5-20 digits/dashes' };
    }

    if (!isNonEmptyString(license_number)) return { valid: false, error: 'License number is required' };

    if (!['Truck', 'Van', 'Bike'].includes(license_category)) {
        return { valid: false, error: 'License category must be Truck, Van, or Bike' };
    }

    if (!isValidDate(license_expiry)) return { valid: false, error: 'Valid license expiry date is required' };

    if (safety_score !== undefined && safety_score !== null) {
        const s = Number(safety_score);
        if (isNaN(s) || s < 0 || s > 100) return { valid: false, error: 'Safety score must be between 0 and 100' };
    }

    return { valid: true };
}

// ---- TRIP VALIDATION ---- //

function validateTrip(body) {
    const { vehicle_id, driver_id, origin, destination, cargo_weight_kg, revenue } = body;

    if (!vehicle_id) return { valid: false, error: 'Vehicle selection is required' };
    if (!driver_id) return { valid: false, error: 'Driver selection is required' };

    if (!isNonEmptyString(origin)) return { valid: false, error: 'Origin city is required' };
    if (origin.length > 100) return { valid: false, error: 'Origin must be under 100 characters' };

    if (!isNonEmptyString(destination)) return { valid: false, error: 'Destination city is required' };
    if (destination.length > 100) return { valid: false, error: 'Destination must be under 100 characters' };

    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
        return { valid: false, error: 'Origin and destination cannot be the same' };
    }

    if (cargo_weight_kg !== undefined && cargo_weight_kg !== null) {
        if (!isNonNegativeNumber(Number(cargo_weight_kg))) return { valid: false, error: 'Cargo weight cannot be negative' };
    }

    if (revenue !== undefined && revenue !== null) {
        if (!isNonNegativeNumber(Number(revenue))) return { valid: false, error: 'Revenue cannot be negative' };
    }

    return { valid: true };
}

// ---- MAINTENANCE VALIDATION ---- //

function validateMaintenance(body) {
    const { vehicle_id, service_type, cost, service_date } = body;

    if (!vehicle_id) return { valid: false, error: 'Vehicle selection is required' };

    const validTypes = ['Oil Change', 'Tire Rotation', 'Brake Inspection', 'Engine Overhaul', 'Battery Replacement', 'Transmission Service', 'AC Repair', 'General Inspection', 'Other'];
    if (!validTypes.includes(service_type)) {
        return { valid: false, error: `Service type must be one of: ${validTypes.join(', ')}` };
    }

    if (cost !== undefined && cost !== null) {
        if (!isNonNegativeNumber(Number(cost))) return { valid: false, error: 'Cost cannot be negative' };
    }

    if (!isValidDate(service_date)) return { valid: false, error: 'Valid service date is required' };

    return { valid: true };
}

// ---- EXPENSE VALIDATION ---- //

function validateExpense(body) {
    const { vehicle_id, type, liters, cost, expense_date } = body;

    if (!vehicle_id) return { valid: false, error: 'Vehicle selection is required' };

    if (!['Fuel', 'Toll', 'Other'].includes(type)) {
        return { valid: false, error: 'Type must be Fuel, Toll, or Other' };
    }

    if (type === 'Fuel' && liters !== undefined && liters !== null) {
        if (!isNonNegativeNumber(Number(liters))) return { valid: false, error: 'Liters cannot be negative' };
    }

    if (!isPositiveNumber(Number(cost))) return { valid: false, error: 'Cost must be a positive number' };

    if (!isValidDate(expense_date)) return { valid: false, error: 'Valid expense date is required' };

    return { valid: true };
}

module.exports = {
    isNonEmptyString,
    isPositiveNumber,
    isNonNegativeNumber,
    isValidDate,
    isValidEmail,
    validateVehicle,
    validateDriver,
    validateTrip,
    validateMaintenance,
    validateExpense,
};
