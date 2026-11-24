import { Transaction } from "@prisma/client";
import { prisma } from "../../config/db";
import { getIo } from "../../config/socket";
import { badRequest } from "../../utils/errors";

export const toTransactionDto = (t: Transaction) => ({
  id: t.id,
  type: t.type,
  amount: Number(t.amount),
  status: t.status,
  checkImage: t.checkImage,
  note: t.note,
  createdAt: t.createdAt,
  confirmedAt: t.confirmedAt,
});

/** Дархости пур кардани ҳисоб бо расми чек */
export const createDeposit = async (
  userId: string,
  amount: number,
  checkImagePath: string
) => {
  const tx = await prisma.transaction.create({
    data: {
      userId,
      type: "DEPOSIT",
      amount,
      status: "PENDING",
      checkImage: checkImagePath,
    },
  });

  // Огоҳии админҳо дар вақти воқеӣ
  getIo().to("admins").emit("admin:new-deposit", toTransactionDto(tx));

  return toTransactionDto(tx);
};

export const getMyTransactions = async (userId: string) => {
  const list = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return list.map(toTransactionDto);
};

export const getActiveBankCard = async () => {
  const card = await prisma.bankCard.findFirst({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  if (!card) throw badRequest("Корти бонкӣ ҳоло дастрас нест — бо админ тамос гиред");
  return {
    cardNumber: card.cardNumber,
    phoneNumber: card.phoneNumber,
    ownerName: card.ownerName,
  };
};
