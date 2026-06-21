import { Schema, Table, column } from '@powersync/web';

const offers = new Table(
  {
    vendor_id:           column.integer,
    title:               column.text,
    description:         column.text,
    category:            column.text,
    discount_percent:    column.real,
    original_price:      column.real,
    offer_price:         column.real,
    image_url:           column.text,
    banner_url:          column.text,
    coupon_code:         column.text,
    redeem_url:          column.text,
    max_redemptions:     column.integer,
    current_redemptions: column.integer,
    valid_from:          column.text,
    valid_until:         column.text,
    is_featured:         column.integer,
    is_active:           column.integer,
    views:               column.integer,
    clicks:              column.integer,
    saves:               column.integer,
    created_at:          column.text,
    video_url:           column.text,
    // joined vendor fields (denormalized by sync rule)
    business_name:       column.text,
    vendor_logo:         column.text,
    vendor_city:         column.text,
    vendor_address:      column.text,
    vendor_lat:          column.real,
    vendor_lng:          column.real,
    vendor_phone:        column.text,
    vendor_email:        column.text,
    vendor_website:      column.text,
    vendor_category:     column.text,
    vendor_description:  column.text,
  },
  { indexes: { by_vendor: ['vendor_id'], by_active: ['is_active', 'created_at'] } },
);

const notifications = new Table(
  {
    user_id:    column.integer,
    title:      column.text,
    body:       column.text,
    type:       column.text,
    offer_id:   column.integer,
    is_read:    column.integer,
    created_at: column.text,
  },
  { indexes: { by_user: ['user_id', 'is_read', 'created_at'] } },
);

const saved_offers = new Table(
  {
    user_id:  column.integer,
    offer_id: column.integer,
    saved_at: column.text,
  },
  { indexes: { by_user: ['user_id'] } },
);

const categories = new Table(
  {
    name:       column.text,
    slug:       column.text,
    icon:       column.text,
    is_active:  column.integer,
    sort_order: column.integer,
  },
  { indexes: { by_active: ['is_active', 'sort_order'] } },
);

const vendors = new Table(
  {
    user_id:           column.integer,
    business_name:     column.text,
    category:          column.text,
    logo_url:          column.text,
    description:       column.text,
    address:           column.text,
    lat:               column.real,
    lng:               column.real,
    city:              column.text,
    phone:             column.text,
    email:             column.text,
    website:           column.text,
    status:            column.text,
    subscription_plan: column.text,
    total_followers:   column.integer,
  },
  { indexes: { by_status: ['status'] } },
);

const users = new Table(
  {
    name:           column.text,
    email:          column.text,
    phone:          column.text,
    role:           column.text,
    city:           column.text,
    is_active:      column.integer,
    login_count:    column.integer,
    coins:          column.integer,
    referral_code:  column.text,
    created_at:     column.text,
    last_login:     column.text,
  },
  { indexes: { by_role: ['role'], by_created: ['created_at'] } },
);

export const AppSchema = new Schema({ offers, notifications, saved_offers, categories, vendors, users });

export type Database = (typeof AppSchema)['types'];
