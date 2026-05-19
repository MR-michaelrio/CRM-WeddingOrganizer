import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
(async () => {
  const data = {
    brandName: "eclipse.sangjit",
    brandTagline: "JA BO DE TA BEK",
    brandLogoUrl: "/logo_eclipsesangjit.png",
    bankName: "BCA",
    bankAccount: "7015466197",
    bankAccountName: "Michael Rio Agustino Tan",
    signatoryName: "Michael Rio Agustino Tan",
    signatureUrl: "/ttd.png",
    thankYouMessage: "TERIMAKASIH ATAS\nKEPERCAYAAN ANDA",
  };
  const setting = await prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  console.log("OK", setting);
  await prisma.$disconnect();
})();
