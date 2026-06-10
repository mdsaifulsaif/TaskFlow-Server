
// export const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
//     const R = 6371e3; // পৃথিবীর ব্যাসার্ধ মিটারে
//     const φ1 = (lat1 * Math.PI) / 180;
//     const φ2 = (lat2 * Math.PI) / 180;
//     const Δφ = ((lat2 - lat1) * Math.PI) / 180;
//     const Δλ = ((lon2 - lon1) * Math.PI) / 180;

//     const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//               Math.cos(φ1) * Math.cos(φ2) *
//               Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//     return R * c; 
// };

/**
 * Haversine ফর্মুলা ব্যবহার করে দুটি জিপিএস কোঅর্ডিনেটের মধ্যবর্তী দূরত্ব মিটারে হিসাব করে।
 */



export const getDistanceInMeters = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371e3; // পৃথিবীর ব্যাসার্ধ মিটারে
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const diffLat = ((lat2 - lat1) * Math.PI) / 180;
  const diffLon = ((lon2 - lon1) * Math.PI) / 180;

  const a = 
    Math.sin(diffLat / 2) * Math.sin(diffLat / 2) +
    Math.cos(p1) * Math.cos(p2) *
    Math.sin(diffLon / 2) * Math.sin(diffLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};