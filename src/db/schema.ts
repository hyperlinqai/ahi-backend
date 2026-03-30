import {
  pgTable,
  text,
  boolean,
  timestamp,
  varchar,
  integer,
  doublePrecision,
  pgEnum,
  unique,
  AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import crypto from 'crypto';

// Enums
export const roleEnum = pgEnum('Role', ['USER', 'ADMIN', 'MANAGER', 'SUPPORT', 'CATALOG_MANAGER']);
export const couponTypeEnum = pgEnum('CouponType', ['FLAT', 'PERCENTAGE', 'FREE_SHIPPING']);
export const orderStatusEnum = pgEnum('OrderStatus', ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']);
export const paymentStatusEnum = pgEnum('PaymentStatus', ['PENDING', 'PAID', 'FAILED', 'REFUNDED']);
export const reviewStatusEnum = pgEnum('ReviewStatus', ['PENDING', 'APPROVED', 'REJECTED']);
export const returnStatusEnum = pgEnum('ReturnStatus', ['PENDING', 'APPROVED', 'REJECTED']);
export const transactionTypeEnum = pgEnum('TransactionType', ['CREDIT', 'DEBIT']);

// Tables
export const users = pgTable('User', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  phone: varchar('phone', { length: 255 }),
  password: text('password').notNull(),
  name: varchar('name', { length: 255 }),
  role: roleEnum('role').default('USER').notNull(),
  isVerified: boolean('isVerified').default(false).notNull(),
  isBlocked: boolean('isBlocked').default(false).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const refreshTokens = pgTable('RefreshToken', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  token: text('token').unique().notNull(),
  userId: text('userId').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const verificationOtps = pgTable('VerificationOTP', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  otp: varchar('otp', { length: 255 }).notNull(),
  userId: text('userId').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const resetTokens = pgTable('ResetToken', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  token: text('token').unique().notNull(),
  userId: text('userId').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const categories = pgTable('Category', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  name: varchar('name', { length: 255 }).unique().notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  description: text('description'),
  imageUrl: text('imageUrl'),
  parentId: text('parentId').references((): AnyPgColumn => categories.id),
  isActive: boolean('isActive').default(true).notNull(),
  sortOrder: integer('sortOrder').default(0).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const products = pgTable('Product', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  description: text('description').notNull(),
  price: doublePrecision('price').notNull(),
  isFeatured: boolean('isFeatured').default(false).notNull(),
  brand: varchar('brand', { length: 255 }),
  categoryId: text('categoryId').references(() => categories.id).notNull(),
  avgRating: doublePrecision('avgRating').default(0).notNull(),
  reviewCount: integer('reviewCount').default(0).notNull(),
  weight: doublePrecision('weight'),
  length: doublePrecision('length'),
  width: doublePrecision('width'),
  height: doublePrecision('height'),
  metaTitle: varchar('metaTitle', { length: 255 }),
  metaDescription: text('metaDescription'),
  metaKeywords: text('metaKeywords'),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const reviews = pgTable('Review', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  rating: integer('rating').notNull(),
  title: varchar('title', { length: 255 }),
  body: text('body'),
  status: reviewStatusEnum('status').default('PENDING').notNull(),
  productId: text('productId').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  userId: text('userId').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  unique().on(t.productId, t.userId),
]);

export const reviewImages = pgTable('ReviewImage', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  url: text('url').notNull(),
  reviewId: text('reviewId').references(() => reviews.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const productImages = pgTable('ProductImage', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  url: text('url').notNull(),
  sortOrder: integer('sortOrder').default(0).notNull(),
  productId: text('productId').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const productVariants = pgTable('ProductVariant', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  value: varchar('value', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 255 }).unique().notNull(),
  stock: integer('stock').default(0).notNull(),
  lowStockAlert: integer('lowStockAlert').default(5).notNull(),
  productId: text('productId').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const coupons = pgTable('Coupon', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  code: varchar('code', { length: 255 }).unique().notNull(),
  type: couponTypeEnum('type').default('FLAT').notNull(),
  discountValue: doublePrecision('discountValue').notNull(),
  maxDiscount: doublePrecision('maxDiscount'),
  minOrderValue: doublePrecision('minOrderValue'),
  usageLimit: integer('usageLimit'),
  usageCount: integer('usageCount').default(0).notNull(),
  perUserLimit: integer('perUserLimit'),
  isActive: boolean('isActive').default(true).notNull(),
  startDate: timestamp('startDate', { precision: 3, mode: 'date' }),
  expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const couponUsages = pgTable('CouponUsage', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  couponId: text('couponId').references(() => coupons.id, { onDelete: 'cascade' }).notNull(),
  userId: text('userId').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const inventoryLogs = pgTable('InventoryLog', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  variantId: text('variantId').references(() => productVariants.id, { onDelete: 'cascade' }).notNull(),
  changeType: varchar('changeType', { length: 255 }).notNull(),
  prevStock: integer('prevStock').notNull(),
  newStock: integer('newStock').notNull(),
  changedById: text('changedById').references(() => users.id).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const addresses = pgTable('Address', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  fullName: varchar('fullName', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 255 }).notNull(),
  addressLine1: varchar('addressLine1', { length: 255 }).notNull(),
  addressLine2: varchar('addressLine2', { length: 255 }),
  city: varchar('city', { length: 255 }).notNull(),
  state: varchar('state', { length: 255 }).notNull(),
  country: varchar('country', { length: 255 }).default('India').notNull(),
  pincode: varchar('pincode', { length: 255 }).notNull(),
  isDefault: boolean('isDefault').default(false).notNull(),
  userId: text('userId').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const carts = pgTable('Cart', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  userId: text('userId').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),
  couponId: text('couponId').references(() => coupons.id),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const cartItems = pgTable('CartItem', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  cartId: text('cartId').references(() => carts.id, { onDelete: 'cascade' }).notNull(),
  productId: text('productId').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  variantId: text('variantId').references(() => productVariants.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  unique().on(t.cartId, t.variantId),
]);

export const orders = pgTable('Order', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  orderNumber: varchar('orderNumber', { length: 255 }).unique().notNull(),
  userId: text('userId').references(() => users.id).notNull(),
  addressId: text('addressId').references(() => addresses.id).notNull(),
  subtotal: doublePrecision('subtotal').notNull(),
  discount: doublePrecision('discount').notNull(),
  total: doublePrecision('total').notNull(),
  status: orderStatusEnum('status').default('PENDING').notNull(),
  paymentStatus: paymentStatusEnum('paymentStatus').default('PENDING').notNull(),
  appliedCouponId: text('appliedCouponId'),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const orderItems = pgTable('OrderItem', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  orderId: text('orderId').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: text('productId').references(() => products.id, { onDelete: 'set null' }),
  variantId: text('variantId').references(() => productVariants.id, { onDelete: 'set null' }),
  productName: varchar('productName', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 255 }).notNull(),
  price: doublePrecision('price').notNull(),
  quantity: integer('quantity').notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const payments = pgTable('Payment', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  userId: text('userId').references(() => users.id).notNull(),
  orderId: text('orderId').references(() => orders.id, { onDelete: 'cascade' }).unique().notNull(),
  razorpayOrderId: varchar('razorpayOrderId', { length: 255 }).unique().notNull(),
  razorpayPaymentId: varchar('razorpayPaymentId', { length: 255 }).unique(),
  razorpaySignature: text('razorpaySignature'),
  amount: doublePrecision('amount').notNull(),
  currency: varchar('currency', { length: 255 }).default('INR').notNull(),
  status: paymentStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const refunds = pgTable('Refund', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  paymentId: text('paymentId').references(() => payments.id, { onDelete: 'cascade' }).notNull(),
  orderId: text('orderId').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  razorpayRefundId: varchar('razorpayRefundId', { length: 255 }).unique().notNull(),
  amount: doublePrecision('amount').notNull(),
  reason: text('reason'),
  status: varchar('status', { length: 255 }).default('PROCESSED').notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const returnRequests = pgTable('ReturnRequest', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  orderId: text('orderId').references(() => orders.id, { onDelete: 'cascade' }).unique().notNull(),
  userId: text('userId').references(() => users.id).notNull(),
  reason: text('reason').notNull(),
  description: text('description'),
  status: returnStatusEnum('status').default('PENDING').notNull(),
  adminNote: text('adminNote'),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const returnRequestImages = pgTable('ReturnRequestImage', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  url: text('url').notNull(),
  returnId: text('returnId').references(() => returnRequests.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const wishlists = pgTable('Wishlist', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  userId: text('userId').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const wishlistItems = pgTable('WishlistItem', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  wishlistId: text('wishlistId').references(() => wishlists.id, { onDelete: 'cascade' }).notNull(),
  productId: text('productId').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  unique().on(t.wishlistId, t.productId),
]);

export const wallets = pgTable('Wallet', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  userId: text('userId').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),
  balance: doublePrecision('balance').default(0).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const walletTransactions = pgTable('WalletTransaction', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  walletId: text('walletId').references(() => wallets.id, { onDelete: 'cascade' }).notNull(),
  amount: doublePrecision('amount').notNull(),
  type: transactionTypeEnum('type').notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const staticPages = pgTable('StaticPage', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  content: text('content').notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  metaTitle: varchar('metaTitle', { length: 255 }),
  metaDescription: text('metaDescription'),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const banners = pgTable('Banner', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  title: varchar('title', { length: 255 }),
  imageUrl: text('imageUrl').notNull(),
  publicId: varchar('publicId', { length: 255 }).notNull(),
  position: varchar('position', { length: 255 }).default('HERO').notNull(),
  sortOrder: integer('sortOrder').default(0).notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  subtitle: varchar('subtitle', { length: 255 }),
  ctaText: varchar('ctaText', { length: 255 }),
  ctaLink: varchar('ctaLink', { length: 255 }),
  startDate: timestamp('startDate', { precision: 3, mode: 'date' }),
  endDate: timestamp('endDate', { precision: 3, mode: 'date' }),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const settings = pgTable('Setting', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  key: varchar('key', { length: 255 }).unique().notNull(),
  value: text('value').notNull(),
  group: varchar('group', { length: 255 }).default('general').notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const auditLogs = pgTable('AuditLog', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  userId: text('userId').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 255 }).notNull(),
  entity: varchar('entity', { length: 255 }).notNull(),
  entityId: varchar('entityId', { length: 255 }),
  oldValue: text('oldValue'),
  newValue: text('newValue'),
  ipAddress: varchar('ipAddress', { length: 255 }),
  userAgent: text('userAgent'),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull(),
});


// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  refreshTokens: many(refreshTokens),
  verificationOtps: many(verificationOtps),
  resetTokens: many(resetTokens),
  reviews: many(reviews),
  inventoryLogs: many(inventoryLogs),
  addresses: many(addresses),
  couponUsages: many(couponUsages),
  cart: one(carts),
  wishlist: one(wishlists),
  wallet: one(wallets),
  orders: many(orders),
  payments: many(payments),
  returnRequests: many(returnRequests),
  auditLogs: many(auditLogs),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const verificationOtpsRelations = relations(verificationOtps, ({ one }) => ({
  user: one(users, { fields: [verificationOtps.userId], references: [users.id] }),
}));

export const resetTokensRelations = relations(resetTokens, ({ one }) => ({
  user: one(users, { fields: [resetTokens.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: 'SubCategories' }),
  children: many(categories, { relationName: 'SubCategories' }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  images: many(productImages),
  variants: many(productVariants),
  reviews: many(reviews),
  wishlists: many(wishlistItems),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  images: many(reviewImages),
}));

export const reviewImagesRelations = relations(reviewImages, ({ one }) => ({
  review: one(reviews, { fields: [reviewImages.reviewId], references: [reviews.id] }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  inventoryLogs: many(inventoryLogs),
  orderItems: many(orderItems),
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  usages: many(couponUsages),
  carts: many(carts),
}));

export const couponUsagesRelations = relations(couponUsages, ({ one }) => ({
  coupon: one(coupons, { fields: [couponUsages.couponId], references: [coupons.id] }),
  user: one(users, { fields: [couponUsages.userId], references: [users.id] }),
}));

export const inventoryLogsRelations = relations(inventoryLogs, ({ one }) => ({
  variant: one(productVariants, { fields: [inventoryLogs.variantId], references: [productVariants.id] }),
  changedBy: one(users, { fields: [inventoryLogs.changedById], references: [users.id] }),
}));

export const addressesRelations = relations(addresses, ({ one, many }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
  orders: many(orders),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, { fields: [carts.userId], references: [users.id] }),
  coupon: one(coupons, { fields: [carts.couponId], references: [coupons.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  address: one(addresses, { fields: [orders.addressId], references: [addresses.id] }),
  items: many(orderItems),
  payment: one(payments),
  refunds: many(refunds),
  returnRequest: one(returnRequests),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [orderItems.variantId], references: [productVariants.id] }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  refunds: many(refunds),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  payment: one(payments, { fields: [refunds.paymentId], references: [payments.id] }),
  order: one(orders, { fields: [refunds.orderId], references: [orders.id] }),
}));

export const returnRequestsRelations = relations(returnRequests, ({ one, many }) => ({
  order: one(orders, { fields: [returnRequests.orderId], references: [orders.id] }),
  user: one(users, { fields: [returnRequests.userId], references: [users.id] }),
  images: many(returnRequestImages),
}));

export const returnRequestImagesRelations = relations(returnRequestImages, ({ one }) => ({
  returnRequest: one(returnRequests, { fields: [returnRequestImages.returnId], references: [returnRequests.id] }),
}));

export const wishlistsRelations = relations(wishlists, ({ one, many }) => ({
  user: one(users, { fields: [wishlists.userId], references: [users.id] }),
  items: many(wishlistItems),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  wishlist: one(wishlists, { fields: [wishlistItems.wishlistId], references: [wishlists.id] }),
  product: one(products, { fields: [wishlistItems.productId], references: [products.id] }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
  transactions: many(walletTransactions),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(wallets, { fields: [walletTransactions.walletId], references: [wallets.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));
