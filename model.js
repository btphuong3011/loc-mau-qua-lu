"use strict";

const days = [
  { id: "mon", title: "Thứ Hai" },
  { id: "wed", title: "Thứ Tư" },
  { id: "fri", title: "Thứ Sáu" },
];

const patients = [
  { id: "hanh", name: "Bà Hạnh", area: "Xóm Bãi", initial: "H", color: "peach" },
  { id: "minh", name: "Ông Minh", area: "Xóm Vườn", initial: "M", color: "mint" },
  { id: "thu", name: "Chị Thư", area: "Xóm Gò", initial: "T", color: "lavender" },
];

const slots = {
  eastMorning: { facility: "east", name: "Cơ sở Cầu Đông", time: "08:00", starts: 480, capacity: 1 },
  northMorning: { facility: "north", name: "Cơ sở Đồi Bắc", time: "09:00", starts: 540, capacity: 1 },
  eastAfternoon: { facility: "east", name: "Cơ sở Cầu Đông", time: "13:30", starts: 810, capacity: 1 },
  northAfternoon: { facility: "north", name: "Cơ sở Đồi Bắc", time: "14:00", starts: 840, capacity: 1 },
};

const trips = {
  eastEarly: {
    facility: "east", name: "Xe điểm đón ven sông", time: "07:10", arrives: 465, capacity: 2,
    serves: ["hanh", "minh", "thu"],
  },
  northEarly: {
    facility: "north", name: "Xe tuyến đồi", time: "08:05", arrives: 525, capacity: 1,
    serves: ["hanh", "minh", "thu"],
  },
  eastLate: {
    facility: "east", name: "Xe điểm đón ven sông", time: "12:35", arrives: 795, capacity: 2,
    serves: ["hanh", "minh", "thu"],
  },
  northLate: {
    facility: "north", name: "Xe hỗ trợ tuyến đồi", time: "13:05", arrives: 825, capacity: 2,
    serves: ["hanh", "minh", "thu"],
  },
  northBackup: {
    facility: "north", name: "Xe dự phòng đường cao", time: "12:50", arrives: 830, capacity: 1,
    serves: ["hanh", "thu"],
  },
};

const scenarios = {
  facility: {
    label: "Cơ sở tạm dừng",
    title: "Cơ sở Ven Sông tạm dừng cả tuần",
    detail: "Ba người bệnh cần thu xếp lại các buổi lọc đã lên lịch.",
    blockedTrips: {},
  },
  bridge: {
    label: "Cầu bị chia cắt",
    title: "Các chuyến qua cầu dừng vào thứ Tư",
    detail: "Cơ sở Ven Sông vẫn đóng. Hai chuyến đến Cầu Đông bị gián đoạn vào thứ Tư.",
    blockedTrips: { wed: ["eastEarly", "eastLate"] },
  },
  vehicle: {
    label: "Xe hỗ trợ hủy chuyến",
    title: "Xe hỗ trợ tuyến đồi hủy chuyến thứ Sáu",
    detail: "Cơ sở Ven Sông vẫn đóng. Lịch đi Đồi Bắc chiều thứ Sáu cần được kiểm tra lại.",
    blockedTrips: { fri: ["northLate"] },
  },
};

const sessions = Object.fromEntries(days.flatMap((day) => patients.map((patient) => [
  `${day.id}-${patient.id}`, { day: day.id, patient: patient.id },
])));

function initialPlans() {
  return {
    "mon-hanh": { slot: "eastMorning", trip: "eastEarly" },
    "mon-minh": { slot: "northMorning", trip: "northEarly" },
    "mon-thu": { slot: "eastAfternoon", trip: "eastLate" },
    "wed-minh": { slot: "eastMorning", trip: "eastEarly" },
    "wed-thu": { slot: "northAfternoon", trip: "northLate" },
    "fri-hanh": { slot: "northAfternoon", trip: "northLate" },
  };
}

function interruption(key, plan, scenario) {
  if (scenarios[scenario].blockedTrips[sessions[key].day]?.includes(plan.trip)) {
    return "Chuyến đã chọn bị gián đoạn.";
  }
  return "";
}

function occupancy(key, type, option, plans) {
  const { day } = sessions[key];
  return Object.entries(plans).filter(([other, plan]) =>
    other !== key && sessions[other].day === day && plan[type] === option
  ).length;
}

function slotBlock(key, choice, plans) {
  if (occupancy(key, "slot", choice, plans) >= slots[choice].capacity) {
    return "Khung giờ đã có người nhận.";
  }
  return "";
}

function tripBlock(key, choice, slotChoice, plans, scenario) {
  const trip = trips[choice];
  const slot = slots[slotChoice];
  if (!trip.serves.includes(sessions[key].patient)) return "Ngoài khu vực đón.";
  const blocked = interruption(key, { trip: choice }, scenario);
  if (blocked) return blocked;
  if (trip.facility !== slot.facility) return "Chuyến đi đến cơ sở khác.";
  if (trip.arrives > slot.starts) return "Đến sau giờ hẹn.";
  if (occupancy(key, "trip", choice, plans) >= trip.capacity) {
    return "Chuyến đã đủ người.";
  }
  return "";
}

function planBlock(key, plan, plans, scenario) {
  if (!plan || !slots[plan.slot] || !trips[plan.trip]) return "Cần chỗ lọc và chuyến đi.";
  return slotBlock(key, plan.slot, plans) ||
    tripBlock(key, plan.trip, plan.slot, plans, scenario);
}

function reviewPlans(plans, scenario) {
  return Object.fromEntries(Object.keys(sessions).map((key) => {
    const plan = plans[key];
    return [key, !plan ? "pending" : planBlock(key, plan, plans, scenario) ? "review" : "ready"];
  }));
}

function suggestPlans(current, scenario) {
  const statuses = reviewPlans(current, scenario);
  const result = Object.fromEntries(Object.entries(current).filter(([key]) => statuses[key] === "ready"));
  const changes = [];
  const unplaced = [];
  const slotIds = Object.keys(slots);
  const tripIds = Object.keys(trips);

  // Days have independent capacity. Keep confirmed pairs, then search combinations
  // for the remaining appointments on each day with the same rules as manual edits.
  for (const day of days) {
    const keys = patients.map(({ id }) => `${day.id}-${id}`).filter((key) => statuses[key] !== "ready");
    const working = { ...result };
    let best = { count: -1, retained: -1, wait: Infinity, plans: {} };

    function search(index, count, retained, wait) {
      if (count + keys.length - index < best.count) return;
      if (index === keys.length) {
        if (count > best.count || (count === best.count &&
          (retained > best.retained || (retained === best.retained && wait < best.wait)))) {
          best = { count, retained, wait, plans: Object.fromEntries(keys.filter((key) => working[key]).map((key) => [key, working[key]])) };
        }
        return;
      }

      const key = keys[index];
      for (const slot of slotIds) {
        if (slotBlock(key, slot, working)) continue;
        for (const trip of tripIds) {
          if (tripBlock(key, trip, slot, working, scenario)) continue;
          working[key] = { slot, trip };
          search(index + 1, count + 1, retained + Number(current[key]?.slot === slot),
            wait + slots[slot].starts - trips[trip].arrives);
          delete working[key];
        }
      }
      search(index + 1, count, retained, wait);
    }

    search(0, 0, 0, 0);
    Object.assign(result, best.plans);
    for (const key of keys) {
      if (best.plans[key]) {
        changes.push(key);
      } else {
        const hasSlot = slotIds.some((slot) => !slotBlock(key, slot, result));
        unplaced.push({
          key,
          reason: hasSlot ? "Còn khung giờ nhưng thiếu chuyến phù hợp." : "Các khung giờ dự phòng đã đầy.",
          released: Boolean(current[key]),
        });
      }
    }
  }

  return { plans: result, changes, unplaced };
}

const model = { days, patients, slots, trips, scenarios, sessions, initialPlans, slotBlock, tripBlock, planBlock, reviewPlans, suggestPlans };
if (typeof module !== "undefined") module.exports = model;
else window.floodCare = model;
