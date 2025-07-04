import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const savePlanSelection = async (userId, planData) => {
  console.log('savePlanSelection called with userId:', userId, 'planData:', planData);
  
  try {
    console.log('Creating Firestore document reference...');
    const userRef = doc(db, 'users', userId);
    
    const planInfo = {
      plan: {
        id: planData.planId,
        name: planData.planName,
        price: planData.price,
        minutesIncluded: planData.minutesIncluded,
        selectedAt: planData.selectedAt,
        status: 'active',
        billingCycle: 'monthly',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      },
      usage: {
        minutesUsed: 0,
        minutesRemaining: planData.minutesIncluded,
        currentBillingPeriodStart: new Date().toISOString(),
        overageCharges: 0
      },
      updatedAt: new Date().toISOString()
    };

    console.log('Attempting to save plan info to Firestore:', planInfo);
    await setDoc(userRef, planInfo, { merge: true });
    
    console.log('Plan saved successfully to Firestore:', planInfo);
    return { success: true, data: planInfo };
  } catch (error) {
    console.error('Error saving plan to Firestore:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    return { success: false, error: error.message };
  }
};

export const getUserPlan = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return { success: true, data: userData.plan || null };
    } else {
      return { success: true, data: null };
    }
  } catch (error) {
    console.error('Error getting user plan:', error);
    return { success: false, error: error.message };
  }
};

export const updateMinuteUsage = async (userId, minutesUsed) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const currentPlan = userData.plan;
      const currentUsage = userData.usage || {};
      
      const newMinutesUsed = (currentUsage.minutesUsed || 0) + minutesUsed;
      const minutesRemaining = Math.max(0, currentPlan.minutesIncluded - newMinutesUsed);
      const overageMinutes = Math.max(0, newMinutesUsed - currentPlan.minutesIncluded);
      
      // Calculate overage charges based on plan
      let overageRate = 0.25; // Default rate
      if (currentPlan.id === 'starter') overageRate = 0.35;
      else if (currentPlan.id === 'professional') overageRate = 0.30;
      else if (currentPlan.id === 'enterprise') overageRate = 0.25;
      
      const overageCharges = overageMinutes * overageRate;
      
      const updatedUsage = {
        minutesUsed: newMinutesUsed,
        minutesRemaining,
        overageCharges,
        overageMinutes,
        lastUpdated: new Date().toISOString()
      };
      
      await updateDoc(userRef, {
        usage: updatedUsage,
        updatedAt: new Date().toISOString()
      });
      
      return { success: true, data: updatedUsage };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error updating minute usage:', error);
    return { success: false, error: error.message };
  }
};

export const resetBillingCycle = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const currentPlan = userData.plan;
      
      const resetUsage = {
        minutesUsed: 0,
        minutesRemaining: currentPlan.minutesIncluded,
        currentBillingPeriodStart: new Date().toISOString(),
        overageCharges: 0,
        overageMinutes: 0,
        lastUpdated: new Date().toISOString()
      };
      
      const updatedPlan = {
        ...currentPlan,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      await updateDoc(userRef, {
        plan: updatedPlan,
        usage: resetUsage,
        updatedAt: new Date().toISOString()
      });
      
      return { success: true, data: { plan: updatedPlan, usage: resetUsage } };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error resetting billing cycle:', error);
    return { success: false, error: error.message };
  }
};

export const changePlan = async (userId, newPlanData) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const currentUsage = userData.usage || {};
      
      const updatedPlan = {
        id: newPlanData.planId,
        name: newPlanData.planName,
        price: newPlanData.price,
        minutesIncluded: newPlanData.minutesIncluded,
        selectedAt: newPlanData.selectedAt,
        status: 'active',
        billingCycle: 'monthly',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      // Recalculate usage with new plan limits
      const minutesRemaining = Math.max(0, newPlanData.minutesIncluded - (currentUsage.minutesUsed || 0));
      const overageMinutes = Math.max(0, (currentUsage.minutesUsed || 0) - newPlanData.minutesIncluded);
      
      let overageRate = 0.25;
      if (newPlanData.planId === 'starter') overageRate = 0.35;
      else if (newPlanData.planId === 'professional') overageRate = 0.30;
      else if (newPlanData.planId === 'enterprise') overageRate = 0.25;
      
      const updatedUsage = {
        ...currentUsage,
        minutesRemaining,
        overageMinutes,
        overageCharges: overageMinutes * overageRate,
        lastUpdated: new Date().toISOString()
      };
      
      await updateDoc(userRef, {
        plan: updatedPlan,
        usage: updatedUsage,
        updatedAt: new Date().toISOString()
      });
      
      return { success: true, data: { plan: updatedPlan, usage: updatedUsage } };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error changing plan:', error);
    return { success: false, error: error.message };
  }
}; 