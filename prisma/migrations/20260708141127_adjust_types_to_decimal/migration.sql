/*
  Warnings:

  - You are about to alter the column `rdDays` on the `QuotationItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,1)`.
  - You are about to alter the column `pmDays` on the `QuotationItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,1)`.
  - You are about to alter the column `qcDays` on the `QuotationItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,1)`.
  - You are about to alter the column `integrationDays` on the `QuotationItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,1)`.

*/
-- AlterTable
ALTER TABLE "QuotationItem" ALTER COLUMN "rdDays" SET DATA TYPE DECIMAL(10,1),
ALTER COLUMN "pmDays" SET DATA TYPE DECIMAL(10,1),
ALTER COLUMN "qcDays" SET DATA TYPE DECIMAL(10,1),
ALTER COLUMN "integrationDays" SET DATA TYPE DECIMAL(10,1);
