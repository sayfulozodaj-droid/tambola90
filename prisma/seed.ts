import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPhone = "900000000";

  const existing = await prisma.user.findUnique({ where: { phone: adminPhone } });
  if (!existing) {
    await prisma.user.create({
      data: {
        phone: adminPhone,
        name: "Админ",
        password: await bcrypt.hash("admin123", 10),
        role: "ADMIN",
      },
    });
    console.log(`Админ сохта шуд: телефон ${adminPhone}, парол admin123`);
  }

  const card = await prisma.bankCard.findFirst();
  if (!card) {
    await prisma.bankCard.create({
      data: {
        cardNumber: "8600 0000 0000 0000",
        phoneNumber: "+992 900 00 00 00",
        ownerName: "Tambola90",
      },
    });
    console.log("Корти бонкӣ (намуна) сохта шуд — дар DB иваз кунед!");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
