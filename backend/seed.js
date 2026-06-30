const db = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('--- Starting Database Seeding ---');
    
    const salt = await bcrypt.genSalt(10);
    const pass = await bcrypt.hash('password123', salt);

    // Create Employees
    const emp1Res = await db.query(
      "INSERT INTO employees (name, role, email, password_hash, department, branch) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id",
      ['Amit Patel', 'employee', 'amit@mtpas.com', pass, 'Sales', 'Ashram Road']
    );
    const emp1Id = emp1Res.rows[0].id;

    const emp2Res = await db.query(
      "INSERT INTO employees (name, role, email, password_hash, department, branch) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id",
      ['Suresh Kumar', 'employee', 'suresh@mtpas.com', pass, 'Sales', 'Maninagar']
    );
    const emp2Id = emp2Res.rows[0].id;

    const emp3Res = await db.query(
      "INSERT INTO employees (name, role, email, password_hash, department, branch) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id",
      ['Meera Joshi', 'employee', 'meera@mtpas.com', pass, 'Sales', 'Ashram Road']
    );
    const emp3Id = emp3Res.rows[0].id;

    // 3. Add Performance Metrics (Last 2 Months)
    const months = [new Date('2026-03-01'), new Date('2026-04-01')];
    
    for (const month of months) {
      await db.query(
        "INSERT INTO performance_metrics (employee_id, month_year, total_calls_made, site_visits_planned, site_visits_done, total_bookings, approved_leaves, unwanted_leaves, punctuality_percent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (employee_id, month_year) DO NOTHING",
        [emp1Id, month, 140, 25, 23, 8, 0, 0, 99]
      );
      await db.query(
        "INSERT INTO performance_metrics (employee_id, month_year, total_calls_made, site_visits_planned, site_visits_done, total_bookings, approved_leaves, unwanted_leaves, punctuality_percent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (employee_id, month_year) DO NOTHING",
        [emp2Id, month, 110, 18, 14, 4, 2, 1, 88]
      );
      await db.query(
        "INSERT INTO performance_metrics (employee_id, month_year, total_calls_made, site_visits_planned, site_visits_done, total_bookings, approved_leaves, unwanted_leaves, punctuality_percent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (employee_id, month_year) DO NOTHING",
        [emp3Id, month, 125, 20, 19, 6, 1, 0, 95]
      );
    }

    // 4. Add Qualitative Ratings
    for (const month of months) {
      await db.query(
        "INSERT INTO qualitative_ratings (employee_id, month_year, hr_rating, strengths, improvement_areas, behavior_discipline, target_achievement) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (employee_id, month_year) DO NOTHING",
        [emp1Id, month, 5, 'Exceptional closing skills and lead generation.', 'None identified.', 'Highly professional and disciplined.', 'Exceeded all monthly targets.']
      );
      await db.query(
        "INSERT INTO qualitative_ratings (employee_id, month_year, hr_rating, strengths, improvement_areas, behavior_discipline, target_achievement) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (employee_id, month_year) DO NOTHING",
        [emp2Id, month, 3, 'Steady call volume.', 'Improve site visit conversion.', 'Good, but needs punctuality focus.', 'Met 80% of targets.']
      );
      await db.query(
        "INSERT INTO qualitative_ratings (employee_id, month_year, hr_rating, strengths, improvement_areas, behavior_discipline, target_achievement) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (employee_id, month_year) DO NOTHING",
        [emp3Id, month, 4, 'Strong customer relationship management.', 'Technical product knowledge.', 'Very disciplined.', 'Achieved 100% of targets.']
      );
    }

    console.log('--- Seeding Completed Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('Seeding Error:', err);
    process.exit(1);
  }
}

seed();
