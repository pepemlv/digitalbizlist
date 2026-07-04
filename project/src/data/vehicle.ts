export const carMakes = [
  'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 'Dodge',
  'Ford', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jeep', 'Kia', 'Lexus',
  'Lincoln', 'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Ram', 'Subaru',
  'Tesla', 'Toyota', 'Volkswagen', 'Volvo', 'Other',
];

export const carModelsByMake: Record<string, string[]> = {
  Acura: ['ILX', 'Integra', 'MDX', 'RDX', 'TLX', 'TSX', 'ZDX', 'Other'],
  Audi: ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron', 'Other'],
  BMW: ['2 Series', '3 Series', '4 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X7', 'i3', 'i4', 'iX', 'Other'],
  Buick: ['Enclave', 'Encore', 'Encore GX', 'Envision', 'LaCrosse', 'Regal', 'Verano', 'Other'],
  Cadillac: ['ATS', 'CT4', 'CT5', 'CTS', 'Escalade', 'SRX', 'XT4', 'XT5', 'XT6', 'Other'],
  Chevrolet: ['Blazer', 'Bolt EV', 'Camaro', 'Colorado', 'Corvette', 'Cruze', 'Equinox', 'Impala', 'Malibu', 'Silverado 1500', 'Silverado 2500HD', 'Suburban', 'Tahoe', 'Trailblazer', 'Traverse', 'Trax', 'Other'],
  Chrysler: ['200', '300', 'Pacifica', 'Town & Country', 'Voyager', 'Other'],
  Dodge: ['Challenger', 'Charger', 'Dart', 'Durango', 'Grand Caravan', 'Journey', 'Other'],
  Ford: ['Bronco', 'Bronco Sport', 'Edge', 'Escape', 'Expedition', 'Explorer', 'F-150', 'F-250', 'F-350', 'Fiesta', 'Flex', 'Focus', 'Fusion', 'Maverick', 'Mustang', 'Ranger', 'Taurus', 'Transit', 'Other'],
  GMC: ['Acadia', 'Canyon', 'Savana', 'Sierra 1500', 'Sierra 2500HD', 'Terrain', 'Yukon', 'Yukon XL', 'Other'],
  Honda: ['Accord', 'Civic', 'Clarity', 'CR-V', 'CR-Z', 'Element', 'Fit', 'HR-V', 'Insight', 'Odyssey', 'Passport', 'Pilot', 'Ridgeline', 'Other'],
  Hyundai: ['Accent', 'Elantra', 'Ioniq', 'Ioniq 5', 'Ioniq 6', 'Kona', 'Palisade', 'Santa Cruz', 'Santa Fe', 'Sonata', 'Tucson', 'Veloster', 'Venue', 'Other'],
  Infiniti: ['EX', 'FX', 'G', 'JX', 'M', 'Q40', 'Q50', 'Q60', 'Q70', 'QX30', 'QX50', 'QX55', 'QX60', 'QX70', 'QX80', 'Other'],
  Jeep: ['Cherokee', 'Compass', 'Gladiator', 'Grand Cherokee', 'Grand Wagoneer', 'Patriot', 'Renegade', 'Wagoneer', 'Wrangler', 'Other'],
  Kia: ['Carnival', 'Forte', 'K5', 'Niro', 'Optima', 'Rio', 'Sedona', 'Seltos', 'Sorento', 'Soul', 'Sportage', 'Stinger', 'Telluride', 'Other'],
  Lexus: ['CT', 'ES', 'GS', 'GX', 'IS', 'LC', 'LS', 'LX', 'NX', 'RC', 'RX', 'UX', 'Other'],
  Lincoln: ['Aviator', 'Continental', 'Corsair', 'MKC', 'MKS', 'MKT', 'MKX', 'MKZ', 'Navigator', 'Nautilus', 'Other'],
  Mazda: ['CX-3', 'CX-30', 'CX-5', 'CX-50', 'CX-7', 'CX-9', 'Mazda2', 'Mazda3', 'Mazda5', 'Mazda6', 'MX-5 Miata', 'Other'],
  'Mercedes-Benz': ['A-Class', 'C-Class', 'CLA', 'CLS', 'E-Class', 'G-Class', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'S-Class', 'Sprinter', 'Other'],
  Mitsubishi: ['Eclipse Cross', 'Lancer', 'Mirage', 'Outlander', 'Outlander Sport', 'Other'],
  Nissan: ['Altima', 'Armada', 'Frontier', 'Kicks', 'Leaf', 'Maxima', 'Murano', 'Pathfinder', 'Rogue', 'Sentra', 'Titan', 'Versa', 'Xterra', 'Z', 'Other'],
  Ram: ['1500', '2500', '3500', 'ProMaster', 'ProMaster City', 'Other'],
  Subaru: ['Ascent', 'BRZ', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Outback', 'Solterra', 'WRX', 'Other'],
  Tesla: ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck', 'Roadster', 'Other'],
  Toyota: ['4Runner', 'Avalon', 'bZ4X', 'Camry', 'C-HR', 'Corolla', 'Crown', 'FJ Cruiser', 'GR86', 'Highlander', 'Land Cruiser', 'Prius', 'RAV4', 'Sequoia', 'Sienna', 'Supra', 'Tacoma', 'Tundra', 'Venza', 'Other'],
  Volkswagen: ['Atlas', 'Beetle', 'CC', 'Golf', 'GTI', 'ID.4', 'Jetta', 'Passat', 'Taos', 'Tiguan', 'Touareg', 'Other'],
  Volvo: ['C30', 'S40', 'S60', 'S80', 'S90', 'V60', 'V70', 'V90', 'XC40', 'XC60', 'XC70', 'XC90', 'Other'],
  Other: ['Other'],
};

export const bodyStyles = ['Sedan', 'SUV', 'Truck', 'Coupe', 'Convertible', 'Hatchback', 'Van'];
export const cylinderOptions = ['3', '4', '5', '6', '8'];
export const fuelTypes = ['Gasoline', 'Hybrid', 'Electric', 'Diesel', 'Plug-in Hybrid', 'Flex Fuel'];
export const transmissionTypes = ['Automatic', 'Manual', 'CVT'];
export const driveTypes = ['FWD', 'AWD', 'RWD', '4WD'];
export const vehicleConditions = ['New', 'Excellent', 'Good', 'Fair', 'Salvage'];
export const titleStatuses = ['Clean', 'Rebuilt', 'Salvage', 'Flood', 'Lemon Buyback', 'Missing'];
export const seatMaterials = ['Cloth', 'Leather', 'Vinyl'];
export const sellerTypes = ['Owner', 'Dealer'];
export const availabilityOptions = ['Available', 'Pending', 'Sold'];

export const vehicleFeatureGroups = [
  {
    label: 'Safety',
    features: ['ABS', 'Backup Camera', 'Blind Spot Monitor', 'Lane Keep Assist', 'Adaptive Cruise Control', 'Parking Sensors', 'Airbags'],
  },
  {
    label: 'Comfort',
    features: ['Heated Seats', 'Ventilated Seats', 'Power Seats', 'Dual Climate Control', 'Remote Start', 'Push Button Start'],
  },
  {
    label: 'Technology',
    features: ['Bluetooth', 'Apple CarPlay', 'Android Auto', 'Navigation', 'USB', 'Wireless Charging', 'Premium Sound', 'Wi-Fi Hotspot'],
  },
  {
    label: 'Mechanical',
    features: ['Service Records Available', 'New Engine', 'New Transmission', 'Timing Belt Replaced', 'New Tires', 'New Brakes', 'Warranty Available'],
  },
];

export const allVehicleFeatures = vehicleFeatureGroups.flatMap((group) => group.features);
