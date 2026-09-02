export interface CarData {
  id: string;
  name: string;
  plateNumber: string;
  image: string;
  type: string;
  transmission: string;
  fuel: string;
  status: string;
}

export const INITIAL_CARS: CarData[] = [
  {
    id: 'DA-1150-NF',
    name: 'Toyota Innova Zenix',
    plateNumber: 'DA 1150 NF',
    image: '/image/DA 1150 NF.png',
    type: 'SUV',
    transmission: 'Automatic',
    fuel: 'Bensin',
    status: 'Tersedia'
  },
  {
    id: 'DA-1152-NF',
    name: 'Toyota Innova Zenix',
    plateNumber: 'DA 1152 NF',
    image: '/image/DA 1152 NF.png',
    type: 'SUV',
    transmission: 'Automatic',
    fuel: 'Bensin',
    status: 'Tersedia'
  },
  {
    id: 'DA-1153-NF',
    name: 'Toyota Innova Zenix',
    plateNumber: 'DA 1153 NF',
    image: '/image/DA 1153 NF.png',
    type: 'SUV',
    transmission: 'Automatic',
    fuel: 'Bensin',
    status: 'Tersedia'
  }
];

export const CARS = INITIAL_CARS;
