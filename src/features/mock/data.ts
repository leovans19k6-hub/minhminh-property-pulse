import type { Project, Product, Policy, Voucher, EventItem } from "@/types/models";

const cover = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=800&q=70`;

export const projects: Project[] = [
  {
    id: "vinhomes-vu-yen",
    name: "Vinhomes Vũ Yên",
    developer: "Vinhomes",
    location: "Thuỷ Nguyên, Hải Phòng",
    cover: cover("1568605114967-8130f3a36994"),
    status: "Đang bán",
    totalUnits: 1240,
    availableUnits: 318,
    category: "mixed",
    shortDescription:
      "Đại đô thị đảo sinh thái đẳng cấp phía Bắc Hải Phòng với sản phẩm thấp tầng & căn hộ cao cấp.",
    saleManager: { name: "Trần Minh Quân", phone: "0912 345 678" },
    subzones: ["The Miyabi", "The Zenpark", "The Komorebi"],
    towers: ["S1", "S2", "S3"],
  },
  {
    id: "hoang-huy-new-city",
    name: "Hoàng Huy New City",
    developer: "TCH Hoàng Huy",
    location: "Thuỷ Nguyên, Hải Phòng",
    cover: cover("1600585154340-be6161a56a0c"),
    status: "Đang bán",
    totalUnits: 860,
    availableUnits: 142,
    category: "low-rise",
    shortDescription:
      "Khu đô thị hiện đại quy mô lớn tại trung tâm Thủy Nguyên với shophouse, liền kề và biệt thự.",
    saleManager: { name: "Nguyễn Thu Hà", phone: "0987 654 321" },
    subzones: ["Diamond", "Ruby", "Sapphire"],
  },
  {
    id: "the-minato-residence",
    name: "The Minato Residence",
    developer: "Diamond Land",
    location: "Lê Chân, Hải Phòng",
    cover: cover("1512917774080-9991f1c4c750"),
    status: "Đang bán",
    totalUnits: 468,
    availableUnits: 54,
    category: "apartment",
    shortDescription:
      "Căn hộ Nhật Bản cao cấp trung tâm quận Lê Chân với tiện ích chuẩn resort.",
    saleManager: { name: "Phạm Đức Anh", phone: "0909 111 222" },
    subzones: ["Sakura", "Fuji"],
    towers: ["A", "B", "C"],
  },
  {
    id: "hoang-huy-green-river",
    name: "Hoàng Huy Green River",
    developer: "TCH Hoàng Huy",
    location: "Hồng Bàng, Hải Phòng",
    cover: cover("1494526585095-c41746248156"),
    status: "Sắp mở bán",
    totalUnits: 320,
    availableUnits: 320,
    category: "apartment",
    shortDescription: "Toà căn hộ view sông giữa lòng Hồng Bàng, chuẩn bị mở bán giai đoạn 1.",
    saleManager: { name: "Lê Hoàng Long", phone: "0977 888 999" },
    subzones: ["Riverside"],
    towers: ["GR1"],
  },
];

const price = (billion: number) => Math.round(billion * 1_000_000_000);

export const products: Product[] = [
  {
    id: "p1",
    code: "LK-01-15",
    projectId: "hoang-huy-new-city",
    projectName: "Hoàng Huy New City",
    subzone: "Diamond",
    category: "low-rise",
    type: "Liền kề",
    status: "Còn hàng",
    price: price(8.6),
    landArea: 90,
    buildingArea: 240,
    frontage: 6,
    floors: 4,
    direction: "Đông Nam",
    constructionStatus: "Xây thô",
    images: [cover("1600607687939-ce8a6c25118c"), cover("1600585154526-990dced4db0d")],
  },
  {
    id: "p2",
    code: "SH-02-08",
    projectId: "hoang-huy-new-city",
    projectName: "Hoàng Huy New City",
    subzone: "Ruby",
    category: "low-rise",
    type: "Shophouse",
    status: "Còn hàng",
    price: price(12.4),
    landArea: 100,
    buildingArea: 320,
    frontage: 7,
    floors: 5,
    direction: "Tây Nam",
    constructionStatus: "Hoàn thiện",
    images: [cover("1600566753190-17f0baa2a6c3")],
  },
  {
    id: "p3",
    code: "BT-03-04",
    projectId: "vinhomes-vu-yen",
    projectName: "Vinhomes Vũ Yên",
    subzone: "The Miyabi",
    category: "low-rise",
    type: "Biệt thự đơn lập",
    status: "Đã đặt cọc",
    price: price(28.9),
    landArea: 250,
    buildingArea: 420,
    frontage: 12,
    floors: 3,
    direction: "Đông",
    constructionStatus: "Xây thô",
    images: [cover("1600585154340-be6161a56a0c")],
  },
  {
    id: "p4",
    code: "S1-1508",
    projectId: "vinhomes-vu-yen",
    projectName: "Vinhomes Vũ Yên",
    subzone: "The Zenpark",
    tower: "S1",
    floor: 15,
    category: "apartment",
    type: "2N",
    status: "Còn hàng",
    price: price(3.9),
    netArea: 65,
    grossArea: 72,
    bedrooms: 2,
    bathrooms: 2,
    doorDirection: "Bắc",
    balconyDirection: "Đông Nam",
    view: "Công viên",
    images: [cover("1522708323590-d24dbb6b0267")],
  },
  {
    id: "p5",
    code: "A-1204",
    projectId: "the-minato-residence",
    projectName: "The Minato Residence",
    subzone: "Sakura",
    tower: "A",
    floor: 12,
    category: "apartment",
    type: "1N+",
    status: "Còn hàng",
    price: price(2.35),
    netArea: 48,
    grossArea: 52,
    bedrooms: 1,
    bathrooms: 1,
    doorDirection: "Nam",
    balconyDirection: "Đông",
    view: "Thành phố",
    images: [cover("1493809842364-78817add7ffb")],
  },
  {
    id: "p6",
    code: "B-2101",
    projectId: "the-minato-residence",
    projectName: "The Minato Residence",
    subzone: "Fuji",
    tower: "B",
    floor: 21,
    category: "apartment",
    type: "3N",
    status: "Còn hàng",
    price: price(4.8),
    netArea: 92,
    grossArea: 100,
    bedrooms: 3,
    bathrooms: 2,
    doorDirection: "Đông",
    balconyDirection: "Nam",
    view: "Sông",
    images: [cover("1560448204-e02f11c3d0e2")],
  },
];

export const policies: Policy[] = [
  {
    id: "pol1",
    projectId: "hoang-huy-new-city",
    title: "Chính sách bán hàng T7/2026",
    summary: "Chiết khấu 8% + tặng gói nội thất trị giá 300 triệu.",
    publishedAt: "2026-07-01",
    tag: "Mới",
  },
  {
    id: "pol2",
    projectId: "vinhomes-vu-yen",
    title: "Ưu đãi CBNV Vinhomes Vũ Yên",
    summary: "Hỗ trợ lãi suất 0% trong 24 tháng, ân hạn nợ gốc 36 tháng.",
    publishedAt: "2026-06-20",
  },
  {
    id: "pol3",
    projectId: "the-minato-residence",
    title: "Ưu đãi ra mắt tòa Fuji",
    summary: "Tặng voucher nội thất Panasonic 150 triệu cho 30 khách đầu tiên.",
    publishedAt: "2026-06-28",
    tag: "Hot",
  },
];

export const vouchers: Voucher[] = [
  {
    id: "v1",
    projectId: "hoang-huy-new-city",
    title: "Voucher 50 triệu",
    value: "50.000.000đ",
    expiresAt: "2026-07-31",
    quota: 120,
  },
  {
    id: "v2",
    projectId: "vinhomes-vu-yen",
    title: "Voucher nội thất 100 triệu",
    value: "100.000.000đ",
    expiresAt: "2026-08-15",
    quota: 80,
  },
  {
    id: "v3",
    projectId: "the-minato-residence",
    title: "Voucher giữ chỗ tòa Fuji",
    value: "30.000.000đ",
    expiresAt: "2026-07-20",
    quota: 30,
  },
];

export const events: EventItem[] = [
  {
    id: "e1",
    projectId: "hoang-huy-new-city",
    title: "Site Tour Hoàng Huy New City",
    type: "Site Tour",
    startAt: "2026-07-12T08:00:00",
    location: "Sales Gallery, Thủy Nguyên",
  },
  {
    id: "e2",
    projectId: "vinhomes-vu-yen",
    title: "Kick-off phân khu The Miyabi",
    type: "Kick-off",
    startAt: "2026-07-18T18:30:00",
    location: "Pullman Hải Phòng",
  },
  {
    id: "e3",
    projectId: "the-minato-residence",
    title: "Sự kiện mở bán tòa Fuji",
    type: "Sự kiện",
    startAt: "2026-07-26T09:00:00",
    location: "The Minato Sales Gallery",
  },
];

export function getProject(id: string) {
  return projects.find((p) => p.id === id);
}
export function getProduct(id: string) {
  return products.find((p) => p.id === id);
}
export function productsByProject(id: string) {
  return products.filter((p) => p.projectId === id);
}
export function policiesByProject(id: string) {
  return policies.filter((p) => p.projectId === id);
}
export function vouchersByProject(id: string) {
  return vouchers.filter((v) => v.projectId === id);
}
export function eventsByProject(id: string) {
  return events.filter((e) => e.projectId === id);
}