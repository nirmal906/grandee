const axios           = require('axios');
const locationService = {

    // Search post offices by PIN code
    searchByPincode: async (pincode) => {
        try{
            if(!pincode || !/^\d{6}$/.test(pincode)){
                return {
                    success         : false,
                    message         : 'Invalid PIN code. Must be 6 digits.',
                    data            : []
                };
            }
            const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`,
                { timeout: 10000 }
            );
            const apiData = response.data[0];
            if(apiData.Status === 'Error' || !apiData.PostOffice){
                return{
                    success         : false,
                    message         : apiData.Message || 'No post offices found for this PIN code',
                    data            : []
                };
            }
            return{
                success             : true,
                message             : apiData.Message,
                data                : apiData.PostOffice.map(po => ({
                    name            : po.Name,
                    pincode         : pincode,
                    branchType      : po.BranchType,
                    deliveryStatus  : po.DeliveryStatus,
                    district        : po.District,
                    state           : po.State,
                    region          : po.Region,
                    circle          : po.Circle,
                    country         : po.Country || 'India'
                }))
            };
        }catch(error){
            console.error('searchByPincode error:', error.message);
            return {
                success: false,
                message: 'Failed to fetch PIN code details. Please try again.',
                data: []
            };
        }
    },

    // Search post offices by branch name
    searchByPostOffice: async (postOfficeName) => {
        try{
            if(!postOfficeName || postOfficeName.trim().length < 2){
                return{
                    success         : false,
                    message         : 'Post office name must be at least 2 characters',
                    data            : []
                };
            }
            const response = await axios.get(`https://api.postalpincode.in/postoffice/${encodeURIComponent(postOfficeName.trim())}`,
                { timeout: 10000 }
            );
            const apiData = response.data[0];
            if(apiData.Status === 'Error' || !apiData.PostOffice){
                return{
                    success         : false,
                    message         : apiData.Message || 'No post offices found with this name',
                    data            : []
                };
            }
            return {
                success             : true,
                message             : apiData.Message,
                data                : apiData.PostOffice.map(po => ({
                    name            : po.Name,
                    pincode         : po.PINCode,
                    branchType      : po.BranchType,
                    deliveryStatus  : po.DeliveryStatus,
                    district        : po.District,
                    state           : po.State,
                    region          : po.Region,
                    circle          : po.Circle,
                    country         : po.Country || 'India'
                }))
            };
        }catch(error){
            console.error('searchByPostOffice error:', error.message);
            return {
                success: false,
                message: 'Failed to fetch post office details. Please try again.',
                data: []
            };
        }
    }
};
module.exports = locationService;