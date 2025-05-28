import Counter, { ICounter } from '../models/Counter.js';

/**
 * ดึงค่า sequence ถัดไปสำหรับชื่อที่กำหนด
 * @param name ชื่อ sequence (เช่น 'serverId', 'taskId')
 * @returns sequence ถัดไป (number)
 */
const getNextSequence = async (name: string): Promise<number> => {
  try {
    let counter: ICounter | null = await Counter.findOne({ _id: name });

    if (!counter) {
      // ถ้าไม่พบข้อมูล ให้สร้างใหม่
      counter = new Counter({ _id: name, seq: 0 });
      await counter.save();
    }

    // เพิ่มค่า sequence และบันทึก
    counter.seq += 1;
    await counter.save();

    return counter.seq;
  } catch (err) {
    console.error('Error while getting next sequence:', err);
    throw err;
  }
};

export default getNextSequence;