import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const prisma = app.get(PrismaService);
    const patients = await prisma.patientProfile.findMany({
      select: {
        displayName: true,
        user: { select: { displayName: true } },
      },
    });

    const counts = {
      bothNull: 0,
      profileNullUserPresent: 0,
      profilePresentUserNull: 0,
      equal: 0,
      different: 0,
    };

    for (const patient of patients) {
      const profileName = patient.displayName?.trim() || null;
      const userName = patient.user.displayName?.trim() || null;

      if (!profileName && !userName) counts.bothNull += 1;
      else if (!profileName) counts.profileNullUserPresent += 1;
      else if (!userName) counts.profilePresentUserNull += 1;
      else if (profileName === userName) counts.equal += 1;
      else counts.different += 1;
    }

    console.log(
      JSON.stringify(
        { totalPatientProfiles: patients.length, ...counts },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
