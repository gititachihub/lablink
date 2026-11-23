export interface DemoDepartment {
  name: string;
  building: string;
  floor: number;
  contactEmail: string;
}

export interface DemoEquipment {
  name: string;
  departmentName: string;
  category: string;
  description: string;
  specifications: Record<string, string>;
  isOperational: boolean;
  requiresTraining: boolean;
  maxBookingHours: number;
  labOpen: string;
  labClose: string;
}

export interface DemoUser {
  email: string;
  name: string;
  role: 'student' | 'faculty';
  departmentName: string;
  studentId?: string;
}

export const DEMO_PASSWORD = 'DemoPass!2026';

export const DEPARTMENTS: DemoDepartment[] = [
  { name: 'Physics', building: 'Science Block A', floor: 2, contactEmail: 'physics@campus.edu' },
  { name: 'Chemistry', building: 'Science Block B', floor: 1, contactEmail: 'chemistry@campus.edu' },
  { name: 'Biomedical Engineering', building: 'Engineering Block C', floor: 3, contactEmail: 'bme@campus.edu' },
];

export const EQUIPMENT: DemoEquipment[] = [
  // Physics
  {
    name: 'X-Ray Diffractometer',
    departmentName: 'Physics',
    category: 'Diffraction',
    description: 'High-resolution XRD for crystal structure, phase analysis, and thin-film characterization.',
    specifications: { wavelength: 'Cu-Ka 1.5418A', voltage: '40 kV', current: '30 mA', goniometer: 'Theta-2Theta' },
    isOperational: true,
    requiresTraining: true,
    maxBookingHours: 4,
    labOpen: '09:00',
    labClose: '18:00',
  },
  {
    name: 'Optical Spectrometer',
    departmentName: 'Physics',
    category: 'Spectroscopy',
    description: 'UV-Vis-NIR spectrometer covering 190nm to 2500nm with integrating sphere accessory.',
    specifications: { range: '190-2500 nm', resolution: '0.1 nm', detector: 'InGaAs/PMT' },
    isOperational: true,
    requiresTraining: false,
    maxBookingHours: 4,
    labOpen: '09:00',
    labClose: '18:00',
  },
  {
    name: 'Cryostat System',
    departmentName: 'Physics',
    category: 'Thermal & Cryogenic',
    description: 'Continuous-flow liquid helium cryostat capable of temperature range 1.5K to 300K.',
    specifications: { tempRange: '1.5K - 300K', coolant: 'LHe / LN2', stability: '+/- 0.05K' },
    isOperational: true,
    requiresTraining: true,
    maxBookingHours: 6,
    labOpen: '09:00',
    labClose: '18:00',
  },
  {
    name: 'Laser Interferometer',
    departmentName: 'Physics',
    category: 'Optics',
    description: 'Michelson and Mach-Zehnder configurable interferometer for nanometer surface metrology.',
    specifications: { source: 'He-Ne 632.8nm', accuracy: '1 nm', aperture: '50 mm' },
    isOperational: true,
    requiresTraining: false,
    maxBookingHours: 3,
    labOpen: '09:00',
    labClose: '18:00',
  },
  // Chemistry
  {
    name: 'Gas Chromatograph',
    departmentName: 'Chemistry',
    category: 'Chromatography',
    description: 'GC equipped with flame ionization detector (FID) and autosampler for volatile organics.',
    specifications: { column: 'DB-5ms 30m', detector: 'FID', carrierGas: 'He' },
    isOperational: true,
    requiresTraining: true,
    maxBookingHours: 4,
    labOpen: '09:00',
    labClose: '18:00',
  },
  {
    name: '400 MHz NMR Spectrometer',
    departmentName: 'Chemistry',
    category: 'Spectroscopy',
    description: 'Broadband multinuclear NMR spectrometer for 1H, 13C, 31P, 19F solution-state experiments.',
    specifications: { frequency: '400 MHz', probe: '5mm BBO', autosampler: '24-position' },
    isOperational: true,
    requiresTraining: true,
    maxBookingHours: 4,
    labOpen: '09:00',
    labClose: '18:00',
  },
  {
    name: 'Rotary Evaporator',
    departmentName: 'Chemistry',
    category: 'Sample Preparation',
    description: 'Benchtop rotovap with digital heating bath, motorized lift, and dry ice condenser.',
    specifications: { bathTemp: '20-180C', rotation: '20-280 rpm', flaskVolume: '50-1000 mL' },
    isOperational: true,
    requiresTraining: false,
    maxBookingHours: 2,
    labOpen: '08:30',
    labClose: '19:00',
  },
  {
    name: 'High-Temp Tube Furnace',
    departmentName: 'Chemistry',
    category: 'Thermal & Cryogenic',
    description: 'Three-zone split tube furnace operating up to 1200C with programmable atmosphere control.',
    specifications: { maxTemp: '1200C', zones: '3', tubeDiameter: '60 mm' },
    isOperational: true,
    requiresTraining: true,
    maxBookingHours: 6,
    labOpen: '09:00',
    labClose: '18:00',
  },
  // Biomedical Engineering
  {
    name: '3D Bioprinter',
    departmentName: 'Biomedical Engineering',
    category: 'Biofabrication',
    description: 'Pneumatic and syringe extrusion 3D bioprinter with UV photocuring and temp control.',
    specifications: { printheads: 'Dual pneumatic', resolution: '10 um', photocure: '365nm / 405nm' },
    isOperational: true,
    requiresTraining: true,
    maxBookingHours: 4,
    labOpen: '09:00',
    labClose: '18:00',
  },
  {
    name: 'Flow Cytometer',
    departmentName: 'Biomedical Engineering',
    category: 'Cell Analysis',
    description: '3-laser, 8-color flow cytometer for cell counting, sorting, and biomarker detection.',
    specifications: { lasers: '405nm, 488nm, 633nm', parameters: '8 colors + FSC/SSC' },
    isOperational: true,
    requiresTraining: true,
    maxBookingHours: 3,
    labOpen: '09:00',
    labClose: '18:00',
  },
  {
    name: 'Real-Time PCR System',
    departmentName: 'Biomedical Engineering',
    category: 'Molecular Biology',
    description: '96-well quantitative qPCR platform with 5-channel multiplex detection.',
    specifications: { block: '96-well 0.2mL', channels: '5 target + 1 FRET', rampRate: '4.5 C/sec' },
    isOperational: true,
    requiresTraining: false,
    maxBookingHours: 3,
    labOpen: '09:00',
    labClose: '18:00',
  },
  {
    name: 'Confocal Laser Microscope',
    departmentName: 'Biomedical Engineering',
    category: 'Microscopy',
    description: 'Inverted confocal laser scanning microscope for high-resolution 3D cell and tissue imaging.',
    specifications: { lasers: '405, 488, 561, 640 nm', objectives: '10x, 20x, 40x oil, 63x oil' },
    isOperational: true,
    requiresTraining: true,
    maxBookingHours: 4,
    labOpen: '09:00',
    labClose: '18:00',
  },
];

export const DEMO_USERS: DemoUser[] = [
  { email: 'faculty.physics@lablink.demo', name: 'Dr. Priya Sharma', role: 'faculty', departmentName: 'Physics' },
  { email: 'faculty.chem@lablink.demo', name: 'Dr. Ravi Kumar', role: 'faculty', departmentName: 'Chemistry' },
  { email: 'faculty.bme@lablink.demo', name: 'Dr. Anita Desai', role: 'faculty', departmentName: 'Biomedical Engineering' },
  { email: 'student1@lablink.demo', name: 'Arjun Patel', role: 'student', departmentName: 'Physics', studentId: 'PH-2024-042' },
  { email: 'student2@lablink.demo', name: 'Meera Nair', role: 'student', departmentName: 'Physics', studentId: 'PH-2024-089' },
  { email: 'student3@lablink.demo', name: 'Karthik Rao', role: 'student', departmentName: 'Chemistry', studentId: 'CH-2024-015' },
  { email: 'student4@lablink.demo', name: 'Zara Khan', role: 'student', departmentName: 'Biomedical Engineering', studentId: 'BM-2024-071' },
];
