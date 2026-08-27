export function generatePerPersonBookingItems(
  bookingObj: any,
  personsList: any[],
  resObj: any,
): any[] {
  const safeParse = (val: any) => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch (e) { return []; }
    }
    return [];
  };

  const travOpts = safeParse(resObj?.travelOptions);
  const roomOpts = safeParse(resObj?.roomOptions);
  const gstRate = (resObj?.gstPercentage ?? 5) / 100;
  
  const tripPrice = Number(resObj?.price || 0);
  const locationOptions: { name: string; price: number }[] = [];
  const seenLocs = new Set<string>();

  const variants = safeParse(resObj?.variants);
  if (variants.length > 0) {
    variants.forEach((v: any) => {
      const name = (v.location || v.cityName || v.name || v.variantName || v.city || "").trim();
      if (name && !seenLocs.has(name.toLowerCase())) {
        seenLocs.add(name.toLowerCase());
        const price = Number(v.discountedPrice) || Number(v.originalPrice) || tripPrice;
        locationOptions.push({ name, price });
      }
    });
  }

  const pickupCities = safeParse(resObj?.pickupCities);
  if (pickupCities.length > 0) {
    resObj.pickupCities.forEach((c: any) => {
      const name = (c.cityName || c.location || c.name || "").trim();
      if (name && !seenLocs.has(name.toLowerCase())) {
        seenLocs.add(name.toLowerCase());
        const deduction = Number(c.deductionAmount || 0);
        const price = Math.max(0, tripPrice - deduction);
        locationOptions.push({ name, price });
      }
    });
  }

  const getBaseLocPrice = (locName: string) => {
    if (!locName) return tripPrice;
    const match = locationOptions.find((l) => l.name.toLowerCase() === locName.toLowerCase().trim());
    return match ? match.price : tripPrice;
  };

  const bookingLocPrice = getBaseLocPrice(bookingObj.pickupCity || bookingObj.trainClass || "");

  const matchTrainClass = (label: string, train: string) => {
    if (!label || !train) return false;
    label = label.toLowerCase().trim();
    train = train.toLowerCase().trim();
    if (label === train) return true;
    if (
      train.includes("3ac") ||
      train.includes("3-tier") ||
      train.includes("3c")
    ) {
      if (train.includes("non ac") || train.includes("non-ac")) return false;
      return label.includes("3ac") || label.includes("3-tier");
    }
    if (train.includes("sleeper")) return label.includes("sleeper");
    return false;
  };

  const matchRoomType = (label: string, room: string) => {
    if (!label || !room) return false;
    label = label.toLowerCase().trim();
    room = room.toLowerCase().trim();
    if (label === room) return true;
    if (label.includes(room) || room.includes(label)) return true;
    if (room.includes("double") || room.includes("couple"))
      return label.includes("double") || label.includes("couple");
    if (room.includes("triple")) return label.includes("triple");
    if (room.includes("quad")) return label.includes("quad");
    return false;
  };

  const isDirectChandigarh =
    (bookingObj.pickupCity || "").toLowerCase().includes("chandigarh to chandigarh") ||
    (bookingObj.pickupCity || "").toLowerCase().trim() === "chandigarh";

  let routeStr = "";
  if (bookingObj.pickupCity) {
    const rawCity = bookingObj.pickupCity.trim();
    if (rawCity.toLowerCase().includes(" to ")) {
      routeStr = ` (${rawCity})`;
    } else {
      routeStr = ` (${rawCity} to ${rawCity})`;
    }
  }

  const items: any[] = [];
  const originalPaxCount = bookingObj.numberOfTravelers || 1;
  const activePersonsList = (personsList || []).filter(
    (p: any) => !p.isCancelled && p.status !== "CANCELLED"
  );

  const paxCount =
    activePersonsList.length > 0
      ? activePersonsList.length
      : originalPaxCount;

  const rawTotal =
    Number(bookingObj.totalAmount) ||
    Number(bookingObj.amount) ||
    Number(bookingObj.price) ||
    0;
  const rawBase = Number(bookingObj.baseAmount) || 0;
  const discount =
    Number(bookingObj.discount) || Number(bookingObj.discountAmount) || 0;

  let subtotal = 0;
  if (rawTotal > 0) {
    subtotal = rawTotal / (1 + gstRate);
  } else if (rawBase > 0) {
    subtotal = rawBase;
  } else if (resObj?.price) {
    subtotal = (Number(resObj.price) || 15000) * paxCount;
  } else {
    subtotal = 15000 * paxCount;
  }

  if (paxCount !== originalPaxCount && originalPaxCount > 0 && subtotal > 0 && activePersonsList.length > 0) {
    subtotal = (subtotal / originalPaxCount) * paxCount;
  }

  const totalBaseRequired = Math.max(1000, subtotal + discount);

  let sumOfDeltas = 0;
  const processedPersons: any[] = [];

  if (activePersonsList.length > 0) {
    activePersonsList.forEach((p: any, idx: number) => {
      const pTrain =
        p.trainOption || p.trainClass || bookingObj.trainClass || "Sleeper";
      const pRoom =
        p.roomSharing || p.roomType || bookingObj.roomType || "Triple Sharing";
      const personName =
        p.name ||
        (idx === 0
          ? bookingObj.fullName || bookingObj.name || "Guest"
          : `Traveler ${idx + 1}`);

      const tMatch = travOpts.find((opt: any) =>
        matchTrainClass(opt.label, pTrain),
      );
      const locPrice = getBaseLocPrice(pTrain);
      const trainDelta = (tMatch ? tMatch.priceDelta || 0 : 0) + (locPrice - bookingLocPrice);
      const isLocMatch = locationOptions.some(l => l.name.toLowerCase() === pTrain.toLowerCase().trim());
      const trainLabel = isDirectChandigarh ? "Base Package" : (tMatch?.label || (isLocMatch ? pTrain : pTrain));

      const rMatch = roomOpts.find((opt: any) =>
        matchRoomType(opt.label, pRoom),
      );
      const roomDelta = rMatch ? rMatch.priceDelta || 0 : 0;
      const roomLabel = rMatch?.label || pRoom;

      sumOfDeltas += trainDelta + roomDelta;
      processedPersons.push({
        p,
        idx,
        trainLabel,
        roomLabel,
        trainDelta,
        roomDelta,
        personName,
      });
    });
  } else {
    const personName =
      bookingObj.fullName || bookingObj.name || "Lead Passenger";
    const pTrain = bookingObj.trainClass || "Sleeper";
    const pRoom = bookingObj.roomType || "Triple Sharing";

    const tMatch = travOpts.find((opt: any) =>
      matchTrainClass(opt.label, pTrain),
    );
    const locPrice = getBaseLocPrice(pTrain);
    const trainDelta = (tMatch ? tMatch.priceDelta || 0 : 0) + (locPrice - bookingLocPrice);
    const isLocMatch = locationOptions.some(l => l.name.toLowerCase() === pTrain.toLowerCase().trim());
    const trainLabel = isDirectChandigarh ? "Base Package" : (tMatch?.label || (isLocMatch ? pTrain : pTrain));

    const rMatch = roomOpts.find((opt: any) => matchRoomType(opt.label, pRoom));
    const roomDelta = rMatch ? rMatch.priceDelta || 0 : 0;
    const roomLabel = rMatch?.label || pRoom;

    for (let idx = 0; idx < paxCount; idx++) {
      const nameSuffix = paxCount > 1 ? `${personName} ${idx + 1}` : personName;
      sumOfDeltas += trainDelta + roomDelta;
      processedPersons.push({
        p: { id: `fb-${idx}` },
        idx,
        trainLabel,
        roomLabel,
        trainDelta,
        roomDelta,
        personName: nameSuffix,
      });
    }
  }

  const variantBasePrice = (totalBaseRequired - sumOfDeltas) / paxCount;
  let runningSum = 0;

  processedPersons.forEach((pp, index) => {
    const transRate = Math.round(variantBasePrice + pp.trainDelta);
    const accomRate = Math.round(pp.roomDelta);

    let adjustedTransRate = transRate;
    if (index === processedPersons.length - 1) {
      adjustedTransRate =
        Math.round(totalBaseRequired) - runningSum - accomRate;
    } else {
      runningSum += transRate + accomRate;
    }

    const itemVariantName = pp.trainLabel;
    const itemName = `${pp.trainLabel}${routeStr} [${pp.personName}]`;

    items.push({
      id: `transport-${pp.p.id || pp.idx}-${pp.idx}`,
      personId: pp.p.id || `p-${pp.idx}`,
      category: "transport",
      variantName: itemVariantName,
      name: itemName,
      rate: adjustedTransRate,
      qty: 1,
    });

    items.push({
      id: `accom-${pp.p.id || pp.idx}-${pp.idx}`,
      personId: pp.p.id || `p-${pp.idx}`,
      category: "accommodation",
      variantName: pp.roomLabel,
      name: `${pp.roomLabel} [${pp.personName}]`,
      rate: accomRate,
      qty: 1,
    });
  });

  if (discount > 0) {
    const perPaxDiscount = discount / paxCount;
    let runningDiscountSum = 0;

    processedPersons.forEach((pp, index) => {
      let adjustedDiscount = Math.round(perPaxDiscount);
      if (index === processedPersons.length - 1) {
        adjustedDiscount = Math.round(discount) - runningDiscountSum;
      } else {
        runningDiscountSum += adjustedDiscount;
      }

      if (adjustedDiscount > 0) {
        items.push({
          id: `discount-${pp.p.id || pp.idx}-${pp.idx}`,
          personId: pp.p.id || `p-${pp.idx}`,
          category: "discounts",
          variantName: bookingObj.discountReason || "Discount",
          name: `Discount (${bookingObj.discountReason || "Promo / Early Bird"}) [${pp.personName}]`,
          rate: -Math.abs(adjustedDiscount),
          qty: 1,
        });
      }
    });
  }

  return items;
}
