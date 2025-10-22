import { useContext, useEffect, useState } from 'react'
import axios from 'axios';
import {UserContext} from '../App'
import { FilterPaginationData } from '../common/filter-pagination-data';
import Loader from '../components/loader.component';
import AnimationWrapper from '../common/page-animation';
import NoDataMessage from '../components/nodata.component';
import NotificationCard from '../components/notification-card.component';
import LoadMoreDataBtn from '../components/load-more.component';

const Notifications = () => {

    const [filter, setFilter] = useState("all");
    let {userAuth, userAuth : {access_token, new_notification_available}, setUserAuth} = useContext(UserContext)
    const [notifications, setNotifications] = useState(null);

    let filters = ['all', 'like', 'comment', 'reply'];

    const fetchNotifications = ( { page, deletedDocCount=0 }) =>{

       axios.post(import.meta.env.VITE_DOMAIN_SERVER + "/notification",{
        page, filter, deletedDocCount},{
          headers : {
            "Authorization": `Bearer ${access_token}`
          }
        })
        .then(async ( { data: {notifications:data}}) =>{

          if(new_notification_available){
            setUserAuth({ ...userAuth, new_notification_available: false})
          }

          let formatedData = await FilterPaginationData(
            {
              state: notifications,
              data,
              page,
              countRoute: "/all-notifications-count",
              data_to_send: { filter },
              user: access_token
            })

            setNotifications(formatedData)

        })
        .catch (err =>{
          console.log(err)
        })

    }

    useEffect( () =>{

      if(access_token){
        fetchNotifications( { page: 1})
      }

    },[filter, access_token])

    const handleFilter = (e)=>{
        
        let btn = e.target;
     
        setFilter(btn.innerHTML);
        setNotifications(null)
         
    }

    const btnDarkStyle = {
      whiteSpace: 'nowrap',
      backgroundColor: 'black',
      color: 'white',
      borderRadius: '9999px', 
      padding: '10px 20px',   
      fontSize: '1rem',    
      textTransform: 'capitalize',
      transition: 'background-color 0.3s',
    };
  
    const btnLightStyle = {
      ...btnDarkStyle,          
      backgroundColor: '#D1D5DB', 
      color: 'black',          
    };

    return (
      <div>
        <h1 className="max-md:hidden">Recent Notifications</h1>
        <div className="my-8 flex gap-6">
          {filters.map((filterName, i) => {
            const isActive = filterName === filter;
            return (
              <button
                key={i}
                style={isActive ? btnDarkStyle : btnLightStyle} 
                onClick={handleFilter}
              >
                {filterName}
              </button>
            );
          })}
        </div>

       {
        notifications == null ? <Loader />
        : 
        <>
          {
            notifications.results.length ? 
            notifications.results.map((notification, i)=>{
              return <AnimationWrapper key={i} transition={{delay: i*0.08}}>
                <NotificationCard data={notification} index={i} notificationState={{ notifications, setNotifications}} />
              </AnimationWrapper>
            }) :
            <NoDataMessage message={"No notifications"} />
          }
          <LoadMoreDataBtn state={notifications} fetchDataFunc={fetchNotifications} additionalParam={{deleteDocCount: notifications.deleteDocCount}} />
        </>
       }

      </div>
    );
  };

export default Notifications
