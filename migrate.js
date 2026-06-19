const { PrismaClient } = require('@prisma/client');

async function migrate() {
    const localDb = new PrismaClient({
        datasources: {
            db: { url: "prisma+postgres://localhost:51213/?api_key=eyJkYXRhYmFzZVVybCI6InBvc3RncmVzOi8vcG9zdGdyZXM6cG9zdGdyZXNAbG9jYWxob3N0OjUxMjE0L3RlbXBsYXRlMT9zc2xtb2RlPWRpc2FibGUmY29ubmVjdGlvbl9saW1pdD0xMCZjb25uZWN0X3RpbWVvdXQ9MCZtYXhfaWRsZV9jb25uZWN0aW9uX2xpZmV0aW1lPTAmcG9vbF90aW1lb3V0PTAmc29ja2V0X3RpbWVvdXQ9MCIsIm5hbWUiOiJkZWZhdWx0Iiwic2hhZG93RGF0YWJhc2VVcmwiOiJwb3N0Z3JlczovL3Bvc3RncmVzOnBvc3RncmVzQGxvY2FsaG9zdDo1MTIxNS90ZW1wbGF0ZTE_c3NsbW9kZT1kaXNhYmxlJmNvbm5lY3Rpb25fbGltaXQ9MTAmY29ubmVjdF90aW1lb3V0PTAmbWF4X2lkbGVfY29ubmVjdGlvbl9saWZldGltZT0wJnBvb2xfdGltZW91dD0wJnNvY2tldF90aW1lb3V0PTAifQ" }
        }
    });

    const neonDb = new PrismaClient({
        datasources: {
            db: { url: "postgresql://neondb_owner:npg_Z8Q0RNGtcbBH@ep-summer-block-a4xizjql.us-east-1.aws.neon.tech/neondb?sslmode=require" }
        }
    });

    try {
        console.log('Fetching users from local...');
        const users = await localDb.utilisateur.findMany();
        console.log(`Found ${users.length} users.`);

        if (users.length > 0) {
            console.log('Migrating users to Neon...');
            for (const user of users) {
                process.stdout.write(`Migrating ${user.email}... `);
                await neonDb.utilisateur.upsert({
                    where: { email: user.email },
                    update: user,
                    create: user
                });
                console.log('DONE');
            }
        }

        console.log('Fetching doctors from local...');
        const doctors = await localDb.medecin.findMany();
        console.log(`Found ${doctors.length} doctors.`);
        for (const doc of doctors) {
            process.stdout.write(`Migrating doctor ${doc.utilisateurId}... `);
            await neonDb.medecin.upsert({
                where: { utilisateurId: doc.utilisateurId },
                update: doc,
                create: doc
            });
            console.log('DONE');
        }

        console.log('Fetching patients from local...');
        const patients = await localDb.patient.findMany();
        console.log(`Found ${patients.length} patients.`);
        for (const patient of patients) {
            process.stdout.write(`Migrating patient ${patient.utilisateurId}... `);
            await neonDb.patient.upsert({
                where: { utilisateurId: patient.utilisateurId },
                update: patient,
                create: patient
            });
            console.log('DONE');
        }

        console.log('Migration completed successfully!');
    } catch (e) {
        console.error('\n!!! Migration failed:', e.message);
    } finally {
        await localDb.$disconnect();
        await neonDb.$disconnect();
    }
}

migrate();
