/**
 * [AI-GENERATED][REFACTOR] Canonical pure calculation layer for Recipe/HPP.
 * No DOM, LocalStorage, Capacitor, or window state is accessed here.
 * UI modules remain responsible for rendering and persistence.
 */

function toFiniteNumber(value, fallback = 0) {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : fallback;
}

export function calculateIngredientMetrics(ingredient, { baseFlourWeight = 1000, totalYield = 1 } = {}) {
    const item = ingredient || {};
    const packSize = Math.max(toFiniteNumber(item.pack, 1), 1);
    const price = Math.max(toFiniteNumber(item.price, 0), 0);
    const ratioValue = Math.max(toFiniteNumber(item.ratio, 0), 0);
    const flourWeight = Math.max(toFiniteNumber(baseFlourWeight, 1000), 0);
    const yieldCount = Math.max(toFiniteNumber(totalYield, 1), 1);

    const category = String(item.category || item.type || '');
    const name = String(item.name || item.nama || '').toLowerCase();
    const isTopping = category === 'Bahan Toping' || category === 'Toping' || item.type === 'Toping';
    const isPackaging = category === 'Kemasan';
    const isCostBurden = name.includes('minyak') || isTopping || isPackaging;
    const ratio = item.isFlour ? 100 : ratioValue;

    const grossWeight = isCostBurden
        ? ratioValue * (isPackaging ? 1 : yieldCount)
        : (ratio / 100) * flourWeight;
    const cost = (grossWeight / packSize) * price;

    return Object.freeze({
        grossWeight,
        cost,
        isCostBurden,
        isTopping,
        isPackaging,
        isDough: !isCostBurden
    });
}

export function calculateRecipeHPP(ingredients, { baseFlourWeight = 1000, totalYield = 1, salePrice = 0 } = {}) {
    const list = Array.isArray(ingredients) ? ingredients : [];
    const yieldCount = Math.max(toFiniteNumber(totalYield, 1), 1);
    const pricePerPiece = Math.max(toFiniteNumber(salePrice, 0), 0);

    let totalDoughCost = 0;
    let totalCostBurden = 0;
    let netDoughWeight = 0;
    let netToppingWeight = 0;

    const items = list.map((ingredient) => {
        const metrics = calculateIngredientMetrics(ingredient, { baseFlourWeight, totalYield: yieldCount });
        if (metrics.isCostBurden) {
            totalCostBurden += metrics.cost;
            if (metrics.isTopping) netToppingWeight += metrics.grossWeight;
        } else {
            totalDoughCost += metrics.cost;
            netDoughWeight += metrics.grossWeight;
        }
        return Object.freeze({ ingredient, ...metrics });
    });

    const totalProductionCost = totalDoughCost + totalCostBurden;
    const hppPerPiece = totalProductionCost / yieldCount;
    const weightPerPiece = netDoughWeight / yieldCount;
    const foodCostPercentage = pricePerPiece > 0 ? (hppPerPiece / pricePerPiece) * 100 : 0;
    const profitMarginPercentage = pricePerPiece > 0
        ? ((pricePerPiece - hppPerPiece) / pricePerPiece) * 100
        : 0;
    const totalNetProfit = pricePerPiece > 0
        ? (pricePerPiece * yieldCount) - totalProductionCost
        : 0;

    return Object.freeze({
        items,
        totalDoughCost,
        totalCostBurden,
        totalProductionCost,
        hppPerPiece,
        netDoughWeight,
        netToppingWeight,
        weightPerPiece,
        foodCostPercentage,
        profitMarginPercentage,
        totalNetProfit,
        yieldCount,
        pricePerPiece
    });
}

export function calculateIngredientPreview({ category, ratio, price, pack, baseFlourWeight = 1000, totalYield = 1 } = {}) {
    const metrics = calculateIngredientMetrics(
        { category, ratio, price, pack },
        { baseFlourWeight, totalYield }
    );
    return metrics;
}
