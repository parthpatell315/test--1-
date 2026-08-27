import { describe, expect, it } from "vitest";
import {
  collapseIdenticalMealGroups,
  compactMealSummary,
  compactTripControlRemarks,
  formatDayMeals,
  isAutoFedItineraryRemark,
  matchMenuToStay,
  mealChipLabel,
  opsOnlyRemark,
  parseVendorFoodMenu,
  titleCaseMealPlan,
  isPlausibleDishText,
} from "../vendorFoodMenu";

describe("vendorFoodMenu", () => {
  it("parses mealPlans JSON tariffs from vendor directory", () => {
    const menu = parseVendorFoodMenu({
      name: "Hotel Lake View",
      city: "Munnar",
      mealPlans: JSON.stringify([
        {
          id: "1",
          name: "Group Breakfast",
          type: "BREAKFAST",
          inclusions: "Tea, Paratha, Puri Bhaji",
          perPaxRate: 150,
          isVeg: true,
        },
        {
          id: "2",
          name: "Dinner Thali",
          type: "DINNER",
          inclusions: "Dal, Rice, Sabzi, Roti",
          perPaxRate: 350,
          isVeg: true,
        },
      ]),
    });
    expect(menu?.items).toHaveLength(2);
    expect(menu?.items[0].inclusions).toContain("Paratha");
    expect(compactMealSummary(menu)).toContain("Tea, Paratha, Puri Bhaji");
    expect(compactMealSummary(menu)).toContain("Dal, Rice");
    expect(compactMealSummary(menu, "Breakfast & Dinner")).toContain("Paratha");
  });

  it("parses DirectoryVendorFoodRate rows", () => {
    const menu = parseVendorFoodMenu({
      name: "Hill Kitchen",
      foodRates: [
        { mealType: "LUNCH", menuDescription: "Veg thali + buttermilk", ratePerPerson: 220, isVeg: true },
      ],
    });
    expect(menu?.items[0].type).toBe("Lunch");
    expect(menu?.items[0].inclusions).toContain("buttermilk");
  });

  it("parses foodMenu persisted on vendor notes for hotel profiles", () => {
    const menu = parseVendorFoodMenu({
      name: "Barpa Cottage",
      city: "Manali",
      mealPlans: "AP",
      notes: JSON.stringify({
        foodMenu: [
          { type: "LUNCH", name: "Lunch", inclusions: "Dal, rice, seasonal sabzi, roti" },
        ],
        foodMenuIncluded: { breakfast: false, lunch: true, dinner: true, snacks: false },
      }),
    });
    expect(menu?.mealPlanLabel).toBe("AP");
    expect(menu?.included?.breakfast).toBe(false);
    expect(formatDayMeals(menu).groups.find((g) => g.type === "Lunch")?.dishes).toContain("seasonal sabzi");
  });

  it("hides breakfast dishes when breakfast is not included", () => {
    const menu = parseVendorFoodMenu({
      name: "Barpa Cottage",
      foodMenu: [
        { type: "BREAKFAST", name: "Breakfast", inclusions: "poha, paratha" },
        { type: "DINNER", name: "Dinner", inclusions: "dal, rice, roti" },
      ],
      foodMenuIncluded: { breakfast: false, lunch: false, dinner: true, snacks: false },
    });
    const day = formatDayMeals(menu, "Breakfast & Dinner");
    expect(day.groups.find((g) => g.type === "Breakfast")).toBeUndefined();
    expect(day.groups.find((g) => g.type === "Dinner")?.dishes).toContain("dal, rice, roti");
  });

  it("gates vendor dishes by itinerary meal plan and strips PLAN prefix", () => {
    const menu = parseVendorFoodMenu({
      name: "Hotel Lake View",
      mealTariffs: [
        { type: "LUNCH", name: "Packed Lunch", inclusions: "Veg pulav, pickle, banana, buttermilk" },
        { type: "DINNER", name: "Dinner Thali", inclusions: "Dal fry, jeera rice, roti, gulab jamun" },
      ],
    });
    const day = formatDayMeals(menu, "PLAN Breakfast & Dinner");
    expect(day.source).toBe("vendor");
    expect(day.groups.find((g) => g.type === "Lunch")).toBeUndefined();
    expect(day.groups.find((g) => g.type === "Dinner")?.dishes).toContain("gulab jamun");

    const fallback = formatDayMeals(null, "PLAN Breakfast & Dinner");
    expect(fallback.source).toBe("itinerary");
    expect(fallback.groups[0]?.dishes).toBe("Breakfast & Dinner");
  });

  it("ignores command junk and field-name leftovers so ops only shows real dishes", () => {
    expect(isPlausibleDishText("bash deploy_vps.sh")).toBe(false);
    expect(isPlausibleDishText("BreakfastMenu")).toBe(false);
    const junk = parseVendorFoodMenu({
      name: "Barpa Cottage Manali",
      foodMenu: [
        { type: "BREAKFAST", name: "Breakfast", inclusions: "bash deploy_vps.sh" },
      ],
    });
    expect(junk?.items || []).toHaveLength(0);

    const keyed = parseVendorFoodMenu({
      name: "Barpa Cottage",
      foodMenu: {
        breakfast: "Poha, paratha, tea",
        lunch: "Dal, rice, roti",
        dinner: "Soup, roti, sabzi",
      },
    });
    expect(keyed?.items.find((i) => i.type === "Breakfast")?.inclusions).toContain("Poha");
    expect(keyed?.items.find((i) => i.type === "Dinner")?.inclusions).toContain("Soup");
    const keyedDay = formatDayMeals(keyed, "Breakfast & Dinner");
    expect(keyedDay.groups.find((g) => g.type === "Breakfast")?.dishes).toContain("Poha");
    expect(keyedDay.groups.find((g) => g.type === "Dinner")?.dishes).toContain("Soup");
    expect(keyedDay.groups.find((g) => g.type === "Lunch")).toBeUndefined();
  });

  it("title-cases messy booking meal strings and collapses identical dishes", () => {
    expect(titleCaseMealPlan("Break, LUNCH & dINNER")).toBe("Breakfast, Lunch & Dinner");
    const collapsed = collapseIdenticalMealGroups([
      { type: "Breakfast", dishes: "Dal, Rice, Roti" },
      { type: "Lunch", dishes: "Dal, Rice, Roti" },
      { type: "Dinner", dishes: "Dal, Rice, Roti" },
    ]);
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].type).toBe("Breakfast, Lunch & Dinner");
    expect(mealChipLabel(
      [
        { type: "Breakfast", dishes: "Dal" },
        { type: "Dinner", dishes: "Roti" },
      ],
      "Breakfast & Dinner",
      "vendor",
    )).toBe("Breakfast & Dinner");
    expect(mealChipLabel(
      [{ type: "Dinner", dishes: "Roti" }],
      "Breakfast & Dinner",
      "vendor",
    )).toBe("Breakfast & Dinner");
  });

  it("matches the assigned hotel by name, alias, or vendor code — not another hotel in the same city", () => {
    const barpa = parseVendorFoodMenu({
      name: "Barpa Cottage Manali",
      vendorCode: "VND-1786625842521",
      city: "Manali",
      aliases: ["Barpa"],
      foodMenu: [
        { type: "BREAKFAST", name: "Breakfast", inclusions: "poha, paratha" },
        { type: "DINNER", name: "Dinner", inclusions: "dal, rice, roti" },
      ],
    })!;
    const ameera = parseVendorFoodMenu({
      name: "Ameera Hotel Shimla",
      city: "Shimla",
      foodMenu: [{ type: "DINNER", name: "Dinner", inclusions: "soup, rice" }],
    })!;
    const menus = [barpa, ameera];
    expect(matchMenuToStay(menus, "Stay at Barpa", "Manali")?.vendorName).toBe("Barpa Cottage Manali");
    expect(matchMenuToStay(menus, "Barpa Cottage Manali", "Manali", "VND-1786625842521")?.vendorName).toBe(
      "Barpa Cottage Manali",
    );
    expect(matchMenuToStay(menus, "Ameera Hotel Shimla", "Shimla")?.vendorName).toBe("Ameera Hotel Shimla");
    expect(matchMenuToStay(menus, "Ameera Hotel Shimla", "Shimla")?.items[0].inclusions).toContain("soup");
    expect(matchMenuToStay(menus, "Pending Hotel (Manali)", "Manali")?.vendorName).toBeUndefined();
  });

  it("View dishes merges breakfast-only booking tariffs with full vendor food menu (MAP)", () => {
    const bookingTariffOnly = parseVendorFoodMenu({
      name: "Barpa Cottage",
      vendorCode: "VND-1786625842521",
      city: "Manali",
      mealTariffs: [
        {
          type: "BREAKFAST",
          name: "Group Breakfast",
          inclusions: "Tea/ Coffee, Paratha, Puri Bhaji",
        },
      ],
    })!;
    const directoryFoodMenu = parseVendorFoodMenu({
      name: "Barpa Cottage Manali",
      vendorCode: "VND-1786625842521",
      city: "Manali",
      foodMenu: [
        { type: "BREAKFAST", name: "Breakfast", inclusions: "Tea/ Coffee, Paratha, Puri Bhaji" },
        { type: "DINNER", name: "Dinner", inclusions: "Dal, Rice, Sabzi, Roti" },
      ],
      foodMenuIncluded: { breakfast: true, lunch: false, dinner: true, snacks: false },
    })!;
    // Booking menu listed first — previously won and hid dinner.
    const matched = matchMenuToStay(
      [bookingTariffOnly, directoryFoodMenu],
      "Barpa Cottage",
      "Manali",
      "VND-1786625842521",
    );
    const day = formatDayMeals(matched, "Breakfast & Dinner");
    expect(day.source).toBe("vendor");
    expect(day.groups.find((g) => g.type === "Breakfast")?.dishes).toContain("Paratha");
    expect(day.groups.find((g) => g.type === "Dinner")?.dishes).toContain("Sabzi");
    expect(mealChipLabel(day.groups, "Breakfast & Dinner", "vendor")).toBe("Breakfast & Dinner");
  });

  it("supplements dedicated foodMenu with tariff meals for uncovered types", () => {
    const menu = parseVendorFoodMenu({
      name: "Barpa Cottage",
      foodMenu: [{ type: "BREAKFAST", name: "Breakfast", inclusions: "Poha, tea" }],
      mealTariffs: [
        { type: "DINNER", name: "Dinner Thali", inclusions: "Dal, rice, roti, salad" },
      ],
    });
    expect(menu?.items.find((i) => i.type === "Breakfast")?.inclusions).toContain("Poha");
    expect(menu?.items.find((i) => i.type === "Dinner")?.inclusions).toContain("salad");
    const day = formatDayMeals(menu, "Breakfast & Dinner");
    expect(day.groups.map((g) => g.type)).toEqual(["Breakfast", "Dinner"]);
  });

  it("strips duplicated meals and hotel lines from trip-control remarks", () => {
    const raw = [
      "Meals: Breakfast & Dinner",
      "Hotel/stay: Barpa Cottage",
      "Reporting time: 7:30 AM at Reckong Peo bus stand",
      "Day 3 itinerary dump with overnight stay and inclusions list",
    ].join("\n");
    const compact = compactTripControlRemarks(raw, { hotelName: "Barpa Cottage" });
    expect(compact.toLowerCase()).not.toContain("meals:");
    expect(compact.toLowerCase()).not.toContain("hotel/stay");
    expect(compact).toContain("Reporting time");
  });

  it("treats itinerary dumps as empty so operational remarks stay ops-typed", () => {
    const dump = [
      "Starting location: Manali",
      "Destination: Chandigarh/Jalandhar",
      "Transport details: Board the return train.",
    ].join("\n");
    expect(isAutoFedItineraryRemark(dump)).toBe(true);
    expect(opsOnlyRemark(dump, dump)).toBe("");
    expect(opsOnlyRemark("Late pickup 7:30 at Reckong Peo", dump)).toBe("Late pickup 7:30 at Reckong Peo");
    expect(opsOnlyRemark(undefined, dump)).toBe("");
  });
});
